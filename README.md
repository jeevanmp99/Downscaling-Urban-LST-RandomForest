# Chennai Urban Heat Island (UHI) Analysis
### Land Surface Temperature and UHI Intensity Mapping using Google Earth Engine

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Google%20Earth%20Engine-green.svg)
![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)
![Status](https://img.shields.io/badge/status-Active-brightgreen.svg)

---

## Overview

This repository contains the Google Earth Engine (GEE) JavaScript code for mapping Urban Heat Island (UHI) intensity across the Chennai Metropolitan Area, Tamil Nadu, India. The analysis derives **Land Surface Temperature (LST)** from Landsat 8 thermal infrared imagery and calculates **UHI intensity** as the deviation of each pixel from the city-wide mean LST.

The analysis was conducted as part of the **ClimAct-Chennai Programme** at INHAF, focusing on identifying thermally vulnerable communities and urban zones experiencing extreme heat stress.

---

## Study Area

**Chennai Metropolitan Area, Tamil Nadu, India**
- Latitude: 12°51'N to 13°13'N
- Longitude: 80°03'E to 80°20'E
- Climate: Tropical wet and dry
- Peak heat period: March–May (Summer, pre-monsoon)
- Mean annual temperature: ~28°C
- Population: ~7.1 million

Chennai experiences intense urban heat due to rapid urbanisation, high built-up density, loss of green cover, coastal humidity, and the urban canyon effect in dense residential and commercial zones.

---

## Methodology

### Workflow

```
Study Area Definition (Ward Boundary Shapefile)
        ↓
Landsat 8 Image Collection (Mar-May 2025, <10% cloud)
        ↓
Thermal Band Extraction (ST_B10)
        ↓
LST Conversion to Celsius
(DN × 0.00341802 + 149.0 - 273.15)
        ↓
City-wide Mean LST Calculation
        ↓
UHI Intensity = LST - Mean LST
        ↓
Spectral Indices (NDVI, NDBI, MNDWI)
        ↓
Export GeoTIFF → ArcGIS Pro / QGIS
```

### LST Conversion Formula

Landsat 8 Collection 2 Level-2 thermal band (ST_B10) values are converted from digital numbers to degrees Celsius using the official USGS scale and offset:

```
LST (°C) = (ST_B10 × 0.00341802) + 149.0 − 273.15
```

Where:
- 0.00341802 = scale factor
- 149.0 = additive offset (Kelvin)
- 273.15 = conversion from Kelvin to Celsius

### UHI Intensity

UHI intensity is calculated as the per-pixel deviation from the city-wide mean LST:

```
UHI Intensity = LST(pixel) − Mean LST(city)
```

- Positive values → warmer than city average → Urban Heat Island zones
- Negative values → cooler than city average → Urban Cool Island zones
- Zero → equal to city mean temperature

### Spectral Indices

| Index | Formula | Interpretation |
|---|---|---|
| NDVI | (NIR-RED)/(NIR+RED) | Vegetation cover — low NDVI = high heat |
| NDBI | (SWIR1-NIR)/(SWIR1+NIR) | Built-up surfaces — high NDBI = high heat |
| MNDWI | (GREEN-SWIR1)/(GREEN+SWIR1) | Water bodies — high MNDWI = cooling effect |

---

## Data Used

| Dataset | Provider | GEE Catalog ID | Resolution | Period |
|---|---|---|---|---|
| Landsat 8 OLI/TIRS C2 L2 | NASA / USGS | LANDSAT/LC08/C02/T1_L2 | 30m optical / 100m thermal | Mar–May 2025 |
| Ward Boundary | Local body / User provided | GEE Asset | Vector | Current |

### Bands Used

| Band | Name | Wavelength | Use |
|---|---|---|---|
| ST_B10 | Thermal Infrared | 10.60–11.19 μm | LST derivation |
| SR_B3 | Green | 0.53–0.59 μm | MNDWI |
| SR_B4 | Red | 0.64–0.67 μm | NDVI |
| SR_B5 | NIR | 0.85–0.88 μm | NDVI, NDBI |
| SR_B6 | SWIR1 | 1.57–1.65 μm | NDBI, MNDWI |

---

## Outputs

| Output | Description | Value Range |
|---|---|---|
| LST (°C) | Land Surface Temperature in Celsius | ~25°C – 45°C |
| UHI Intensity | Deviation from city mean LST | ~-5°C to +5°C |
| NDVI | Normalised Difference Vegetation Index | -1 to 1 |
| NDBI | Normalised Difference Built-up Index | -1 to 1 |
| MNDWI | Modified Normalised Difference Water Index | -1 to 1 |

---

## Exported Files

| File | Description |
|---|---|
| Chennai_UHI_2025.tif | UHI intensity map (GeoTIFF, EPSG:32644) |
| Chennai_UHI_2025.2.tif | UHI intensity map with proper mask applied |

---

## How to Use

### Prerequisites
- Google Earth Engine account (free at earthengine.google.com)
- Ward boundary shapefile uploaded as GEE asset

### Steps

1. Open Google Earth Engine Code Editor: https://code.earthengine.google.com
2. Copy the contents of GEE_Scripts/Chennai_UHI_Analysis.js
3. Paste into a new GEE script
4. Update the asset path:

```javascript
var chennai = ee.FeatureCollection('projects/YOUR_PROJECT/assets/YOUR_WARD_SHAPEFILE');
```

5. Click Run
6. Go to Tasks tab and click Run for each export

### Recommended Date Ranges for Chennai

| Period | Season | UHI Characteristic |
|---|---|---|
| Mar–May | Summer (pre-monsoon) | Peak UHI, highest LST |
| Jun–Sep | Southwest Monsoon | Reduced UHI, cloud cover issues |
| Oct–Dec | Northeast Monsoon | Moderate UHI |
| Jan–Feb | Winter | Lowest LST, clearest skies |

---

## Connection to Flood Vulnerability

This UHI analysis is part of a dual vulnerability assessment for Chennai:

1. Flood Vulnerability Map → https://github.com/yourusername/Chennai-Flood-Vulnerability-Mapping
2. Heat Vulnerability Map → This repository

Overlaying both maps identifies communities facing compound climate risk — simultaneous flood and heat vulnerability — which are the priority zones for INHAF community engagement under the ClimAct-Chennai programme.

---

## Limitations

- Landsat 8 thermal band has 100m native resolution, resampled to 30m
- Cloud cover during monsoon season limits temporal coverage
- LST represents surface temperature, not air temperature
- Single-date median composite may not capture peak heat events
- Community-level heat stress requires additional socioeconomic vulnerability indicators

---

## File Structure

```
Chennai-UHI-Analysis/
│
├── README.md                        # This file
├── LICENSE                          # MIT License
├── GEE_Scripts/
│   └── Chennai_UHI_Analysis.js      # Main GEE script
├── Results/
│   └── README.md                    # Results description
└── Docs/
    └── Data_Sources.md              # Detailed data documentation
```

---

## Citation

```
@misc{chennai_uhi_2025,
  author = {Outcast},
  title = {Chennai Urban Heat Island Analysis using Google Earth Engine},
  year = {2025},
  publisher = {GitHub},
  url = {https://github.com/yourusername/Chennai-UHI-Analysis}
}
```

---

## Related Repository

Chennai Flood Vulnerability Mapping: https://github.com/yourusername/Chennai-Flood-Vulnerability-Mapping

---

## Acknowledgements

This work was carried out as part of the ClimAct-Chennai Programme at the Indian National Health and Habitat Foundation (INHAF), in collaboration with the Citizen consumer and civic Action Group (CAG), Chennai.

---

## License

MIT License — see LICENSE file for details.
