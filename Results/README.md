# Results

This folder contains output files from the UHI analysis.

## Expected Output Files

| File | Description |
|---|---|
| Chennai_UHI_2025.tif | UHI intensity map — continuous values in degrees C |
| Chennai_UHI_2025_masked.tif | UHI intensity with proper NoData mask applied |
| Chennai_LST_2025.tif | Land Surface Temperature in degrees Celsius |
| Chennai_UHI_5Class_2025.tif | 5-class UHI classification map |
| Chennai_Indices_2025.tif | Spectral indices composite (NDVI, NDBI, MNDWI, LST) |

All files are exported to Google Drive (GEE_Exports folder) by running the export tasks in the GEE script.

## Key Statistics to Record After Running

After running the script, note these values from the GEE console:

- City-wide Mean LST (degrees C)
- LST range (min, max)
- UHI Intensity range
- UHI Standard Deviation
- Pearson correlation: UHI vs NDVI
- Pearson correlation: UHI vs NDBI
- Pearson correlation: UHI vs MNDWI
- Class distribution (pixels per class)

## Symbology for ArcGIS Pro

### UHI Intensity (Continuous)
- Renderer: Classify or Stretch
- Colour ramp: Blue to Red diverging
- Min: -5, Max: +5

### UHI 5-Class Map
| Class | Label | Hex Colour |
|---|---|---|
| 1 | Severe Cool Island | #313695 |
| 2 | Moderate Cool Island | #74add1 |
| 3 | Neutral | #ffffbf |
| 4 | Moderate Heat Island | #f46d43 |
| 5 | Severe Heat Island | #a50026 |

### LST
- Renderer: Stretch
- Colour ramp: Blue to Red
- Min: 25, Max: 45
