"""
Urban Land Surface Temperature (LST) Downscaling Pipeline
Model: Random Forest Regressor with Area-To-Point Residual Correction
Domain: Chennai 50 km² Inland Urban Transect
"""

import argparse
from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


def build_pipeline(data_dir: Path, output_dir: Path, target_mode: str):
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Configuration
    predictor_names = [
        "B02_10m_50sqkm.tif",
        "B03_10m_50sqkm.tif",
        "B04_10m_50sqkm.tif",
        "B08_10m_50sqkm.tif",
        "B11_10m_50sqkm.tif",
        "B12_10m_50sqkm.tif",
        "NDVI_10m_50sqkm.tif",
        "NDBI_10m_50sqkm.tif",
        "MNDWI_10m_50sqkm.tif",
        "BSI_10m_50sqkm.tif",
        "DEM_10m_50sqkm.tif",
        "Slope_10m_50sqkm.tif",
        "Aspect_10m_50sqkm.tif",
    ]

    if target_mode.upper() == "ECOSTRESS":
        target_name = "ECO_LST_Celsius_70m_50sqkm.tif"
        out_name = "ECOSTRESS_Downscaled_LST_10m_50sqkm_Corrected.tif"
    elif target_mode.upper() == "LANDSAT":
        target_name = "Landsat_LST_Celsius_30m_50sqkm.tif"
        out_name = "LANDSAT_Downscaled_LST_10m_50sqkm_Corrected.tif"
    else:
        raise ValueError("Invalid TARGET_MODE. Choose 'LANDSAT' or 'ECOSTRESS'.")

    # 2. Establish 10m High-Resolution Grid Reference
    ref_path = data_dir / predictor_names[0]
    with rasterio.open(ref_path) as ref:
        ref_profile = ref.profile.copy()
        ref_transform = ref.transform
        ref_crs = ref.crs
        height_10m, width_10m = ref.shape

    # 3. Load and Align 10m Predictors
    print("Loading 10m predictors and establishing uniform spatial grid...")
    pred_10m_list = []
    for fname in predictor_names:
        with rasterio.open(data_dir / fname) as src:
            if src.shape == (height_10m, width_10m) and src.transform == ref_transform:
                data = src.read(1).astype(np.float32)
            else:
                data = np.empty((height_10m, width_10m), dtype=np.float32)
                reproject(
                    source=rasterio.band(src, 1),
                    destination=data,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=ref_transform,
                    dst_crs=ref_crs,
                    resampling=Resampling.bilinear,
                )
            pred_10m_list.append(data)

    X_10m_stack = np.stack(pred_10m_list, axis=-1)

    # 4. Load Coarse Target LST
    print(f"Loading {target_mode.upper()} thermal target...")
    with rasterio.open(data_dir / target_name) as tgt:
        tgt_data = tgt.read(1).astype(np.float32)
        tgt_profile = tgt.profile.copy()
        tgt_transform = tgt.transform
        tgt_crs = tgt.crs
        tgt_shape = tgt.shape
        tgt_nodata = tgt.nodata

    # 5. Aggregate 10m Predictors to Coarse Thermal Grid
    print(
        f"Aggregating 10m predictors to coarse grid ({tgt.res[0]:.1f}m) via average resampling..."
    )
    pred_coarse_list = []
    for i in range(len(predictor_names)):
        coarse_band = np.empty(tgt_shape, dtype=np.float32)
        reproject(
            source=X_10m_stack[:, :, i],
            destination=coarse_band,
            src_transform=ref_transform,
            src_crs=ref_crs,
            dst_transform=tgt_transform,
            dst_crs=tgt_crs,
            resampling=Resampling.average,
        )
        pred_coarse_list.append(coarse_band)

    X_coarse_stack = np.stack(pred_coarse_list, axis=-1)

    # 6. Extract Coarse Valid Training Mask
    valid_mask_coarse = ~np.isnan(tgt_data) & ~np.isinf(tgt_data)
    if tgt_nodata is not None:
        valid_mask_coarse &= tgt_data != tgt_nodata

    # Mask valid bounds and non-null predictors
    for i in range(len(predictor_names)):
        valid_mask_coarse &= ~np.isnan(X_coarse_stack[:, :, i]) & ~np.isinf(
            X_coarse_stack[:, :, i]
        )

    y_train_full = tgt_data[valid_mask_coarse]
    X_train_full = X_coarse_stack[valid_mask_coarse]

    print(f"Total valid coarse training samples: {X_train_full.shape[0]}")

    # 7. Model Training & Out-of-Sample Validation
    print("Training Optimized Random Forest Regressor...")
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full, test_size=0.20, random_state=42
    )

    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=26,
        min_samples_split=4,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=42,
    )
    rf.fit(X_train, y_train)

    # Validation
    val_preds = rf.predict(X_val)
    val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
    val_r2 = r2_score(y_val, val_preds)
    print(f"Validation Performance: RMSE = {val_rmse:.2f} °C, R² = {val_r2:.3f}")

    # Feature Importance Diagnostic Table
    print("\nPredictor Importance:")
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    for idx in sorted_idx:
        print(f"- {predictor_names[idx]:<30}: {importances[idx] * 100:.1f}%")

    # 8. High-Resolution (10m) Inference
    print("Predicting baseline downscaled LST at 10m resolution...")
    valid_mask_10m = np.ones((height_10m, width_10m), dtype=bool)
    for i in range(len(predictor_names)):
        valid_mask_10m &= ~np.isnan(X_10m_stack[:, :, i]) & ~np.isinf(
            X_10m_stack[:, :, i]
        )

    print(
        f"Total valid 10m land pixels for inference: {np.sum(valid_mask_10m)}"
    )

    X_10m_valid = X_10m_stack[valid_mask_10m]
    baseline_10m = np.full((height_10m, width_10m), np.nan, dtype=np.float32)
    baseline_10m[valid_mask_10m] = rf.predict(X_10m_valid)

    # 9. Energy-Conserving Residual Correction
    print(
        "Calculating residuals and applying energy conservation correction..."
    )
    # Aggregate 10m prediction back to coarse resolution
    baseline_coarse = np.full(tgt_shape, np.nan, dtype=np.float32)
    reproject(
        source=baseline_10m,
        destination=baseline_coarse,
        src_transform=ref_transform,
        src_crs=ref_crs,
        dst_transform=tgt_transform,
        dst_crs=tgt_crs,
        resampling=Resampling.average,
    )

    # Residual at coarse scale
    residual_coarse = tgt_data - baseline_coarse

    # Interpolate residual field smoothly to 10m using cubic spline
    residual_10m = np.full((height_10m, width_10m), np.nan, dtype=np.float32)
    reproject(
        source=residual_coarse,
        destination=residual_10m,
        src_transform=tgt_transform,
        src_crs=tgt_crs,
        dst_transform=ref_transform,
        dst_crs=ref_crs,
        resampling=Resampling.cubic,
    )

    # Final energy-conserved downscaled LST
    final_downscaled_lst = baseline_10m + residual_10m

    # 10. GeoTIFF Export
    ref_profile.update(
        {
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw",
        }
    )

    final_downscaled_lst[np.isnan(final_downscaled_lst)] = -9999.0
    export_path = output_dir / out_name

    with rasterio.open(export_path, "w", **ref_profile) as dst:
        dst.write(final_downscaled_lst.astype(np.float32), 1)

    print(f"Export complete: {export_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Downscale LST using Random Forest"
    )
    parser.add_argument(
        "--data_dir",
        type=Path,
        required=True,
        help="Path to folder containing 10m predictors and thermal targets",
    )
    parser.add_argument(
        "--output_dir",
        type=Path,
        required=True,
        help="Path to folder for saving downscaled rasters",
    )
    parser.add_argument(
        "--target",
        type=str,
        default="LANDSAT",
        choices=["LANDSAT", "ECOSTRESS"],
        help="Thermal sensor target",
    )
    args = parser.parse_args()

    build_pipeline(args.data_dir, args.output_dir, args.target)
