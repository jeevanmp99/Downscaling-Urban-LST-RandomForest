# Data Sources Documentation
## Chennai Urban Heat Island (UHI) Analysis

---

## 1. Primary Dataset

| Dataset | Full Name | Provider | GEE Catalog ID | Resolution | Period | Access |
|---|---|---|---|---|---|---|
| Landsat 8 OLI/TIRS C2 L2 | Landsat 8 Collection 2 Level-2 Surface Reflectance and Surface Temperature | NASA / USGS | LANDSAT/LC08/C02/T1_L2 | 30m optical, 100m thermal | Mar–May 2025 | Free |

### Bands Used

| Band | Name | Wavelength | Use | Scale Factor | Offset |
|---|---|---|---|---|---|
| ST_B10 | Thermal Infrared 1 | 10.60–11.19 μm | LST derivation | 0.00341802 | 149.0 |
| SR_B3 | Green | 0.53–0.59 μm | MNDWI | 0.0000275 | -0.2 |
| SR_B4 | Red | 0.64–0.67 μm | NDVI | 0.0000275 | -0.2 |
| SR_B5 | Near Infrared | 0.85–0.88 μm | NDVI, NDBI | 0.0000275 | -0.2 |
| SR_B6 | SWIR 1 | 1.57–1.65 μm | NDBI, MNDWI | 0.0000275 | -0.2 |

### LST Conversion

```
LST (Kelvin)  = ST_B10 × 0.00341802 + 149.0
LST (Celsius) = LST (Kelvin) - 273.15
```

---

## 2. Study Area

| Dataset | Description | Format | Source |
|---|---|---|---|
| Chennai Ward Boundary | Administrative ward polygons | Shapefile (GEE Asset) | Local body / User provided |

- GEE Asset path: projects/blueline-480306/assets/chennai_shp

---

## 3. Data Quality

| Metric | Value |
|---|---|
| Date range | March–May 2025 (peak summer) |
| Cloud cover filter | Less than 10% |
| Composite method | Median |
| Thermal resolution | 100m native, resampled to 30m |
| Spatial coverage | Full Chennai ward boundary |

### Why March–May?

This period represents Chennai's peak pre-monsoon summer season with:
- Maximum Land Surface Temperatures (35–45°C)
- Minimum cloud cover (best Landsat availability)
- Peak UHI effect due to dry conditions and maximum solar radiation

---

## 4. Derived Products

| Product | Formula | Unit | Range |
|---|---|---|---|
| LST | ST_B10 × 0.00341802 + 149.0 - 273.15 | Degrees Celsius | 25–45°C |
| UHI Intensity | LST - Mean LST | Degrees Celsius | -5 to +5°C |
| NDVI | (SR_B5 - SR_B4) / (SR_B5 + SR_B4) | Dimensionless | -1 to 1 |
| NDBI | (SR_B6 - SR_B5) / (SR_B6 + SR_B5) | Dimensionless | -1 to 1 |
| MNDWI | (SR_B3 - SR_B6) / (SR_B3 + SR_B6) | Dimensionless | -1 to 1 |

---

## 5. UHI Classification Scheme

| Class | Label | Threshold |
|---|---|---|
| 1 | Severe Cool Island | UHI less than -1.5 SD |
| 2 | Moderate Cool Island | -1.5 SD to -0.5 SD |
| 3 | Neutral | -0.5 SD to +0.5 SD |
| 4 | Moderate Heat Island | +0.5 SD to +1.5 SD |
| 5 | Severe Heat Island | UHI greater than +1.5 SD |

SD = Standard deviation of UHI intensity across Chennai

---

## 6. Software and Platforms

| Tool | Version | Purpose |
|---|---|---|
| Google Earth Engine | Web-based | Processing, LST derivation, export |
| ArcGIS Pro | 3.4 | Visualization, symbology |
| QGIS | 3.40 | Additional visualization |

---

## 7. Key References

**Landsat 8 data and LST:**
> USGS (2021). Landsat Collection 2 Level-2 Science Product Guide. U.S. Geological Survey.

> Vermote, E. et al. (2016). Preliminary analysis of the performance of the Landsat 8/OLI land surface reflectance product. Remote Sensing of Environment, 185, 46–56.

**UHI methodology:**
> Weng, Q. (2009). Thermal infrared remote sensing for urban climate and environmental studies: Methods, applications, and trends. ISPRS Journal of Photogrammetry and Remote Sensing, 64(4), 335–344.

> Zhao, L. et al. (2014). Strong contributions of local background climate to urban heat islands. Nature, 511(7508), 216–219.

**Spectral indices:**
> Tucker, C.J. (1979). Red and photographic infrared linear combinations for monitoring vegetation. Remote Sensing of Environment, 8(2), 127–150. (NDVI)

> Zha, Y., Gao, J. & Ni, S. (2003). Use of normalized difference built-up index in automatically mapping urban areas from TM imagery. International Journal of Remote Sensing, 24(3), 583–594. (NDBI)

---

## 8. Data Access

All datasets used are freely and publicly available:

- Google Earth Engine: https://earthengine.google.com
- Landsat data: https://earthexplorer.usgs.gov
- USGS Landsat Collection 2 guide: https://www.usgs.gov/landsat-missions/landsat-collection-2

Total data cost: Zero
