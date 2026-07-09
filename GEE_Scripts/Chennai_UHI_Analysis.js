// ============================================================
// CHENNAI URBAN HEAT ISLAND (UHI) ANALYSIS
// Method:       Land Surface Temperature (LST) from Landsat 8
// UHI Metric:   LST deviation from city-wide mean
// Indices:      NDVI, NDBI, MNDWI
// Platform:     Google Earth Engine (GEE)
// Output:       UHI Intensity Map (GeoTIFF)
//
// Author:       Outcast
// Institution:  INHAF / ClimAct-Chennai Programme
// Date:         2025
// ============================================================

// ============================================================
// SECTION 1: STUDY AREA
// Update asset path to your ward boundary shapefile
// ============================================================
var chennai = ee.FeatureCollection(
  'projects/blueline-480306/assets/chennai_shp');

Map.centerObject(chennai, 10);
Map.addLayer(chennai, {color: 'white'}, 'Chennai Boundary');

// ============================================================
// SECTION 2: LANDSAT 8 IMAGE COLLECTION
// Period: March-May 2025 (Summer / peak UHI season)
// Filter: < 10% cloud cover for clean thermal imagery
// ============================================================
var image = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(chennai)
  .filterDate('2025-03-01', '2025-05-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 10))
  .median()
  .clip(chennai);

var sceneCount = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(chennai)
  .filterDate('2025-03-01', '2025-05-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 10));

print('Total scenes used:', sceneCount.size());
print('Scene dates:', sceneCount.aggregate_array('DATE_ACQUIRED'));
print('Cloud cover per scene:', sceneCount.aggregate_array('CLOUD_COVER'));

// ============================================================
// SECTION 3: LAND SURFACE TEMPERATURE (LST)
// Landsat 8 Band ST_B10 (Thermal Infrared, 10.60-11.19 um)
//
// Conversion (USGS Collection 2 Level-2):
// LST (K) = ST_B10 x 0.00341802 + 149.0
// LST (C) = LST (K) - 273.15
// ============================================================
var lst = image.select('ST_B10')
  .multiply(0.00341802)
  .add(149.0)
  .subtract(273.15)
  .rename('LST');

print('LST Statistics (degrees C):', lst.reduceRegion({
  reducer: ee.Reducer.minMax()
    .combine(ee.Reducer.mean(), null, true)
    .combine(ee.Reducer.stdDev(), null, true),
  geometry: chennai.geometry(),
  scale: 30,
  maxPixels: 1e9
}));

Map.addLayer(lst, {
  min: 25, max: 45,
  palette: ['blue', 'yellow', 'orange', 'red']
}, 'LST (degrees C)');

// ============================================================
// SECTION 4: UHI INTENSITY
// UHI Intensity = LST(pixel) - Mean LST(city)
// Positive = heat island, Negative = cool island
// ============================================================
var meanLST = lst.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: chennai.geometry(),
  scale: 30,
  maxPixels: 1e9
});

var meanVal = ee.Number(meanLST.get('LST'));
print('City-wide Mean LST (degrees C):', meanVal);

var uhi = lst.subtract(meanVal).rename('UHI_Intensity');

print('UHI Intensity Statistics (degrees C):', uhi.reduceRegion({
  reducer: ee.Reducer.minMax()
    .combine(ee.Reducer.mean(), null, true)
    .combine(ee.Reducer.stdDev(), null, true),
  geometry: chennai.geometry(),
  scale: 30,
  maxPixels: 1e9
}));

Map.addLayer(uhi, {
  min: -5, max: 5,
  palette: ['#313695','#74add1','#ffffbf','#f46d43','#a50026']
}, 'UHI Intensity (degrees C from mean)');

// ============================================================
// SECTION 5: SPECTRAL INDICES
// ============================================================

// NDVI: (NIR - RED) / (NIR + RED)
var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4'])
  .rename('NDVI');

// NDBI: (SWIR1 - NIR) / (SWIR1 + NIR)
var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5'])
  .rename('NDBI');

// MNDWI: (GREEN - SWIR1) / (GREEN + SWIR1)
var mndwi = image.normalizedDifference(['SR_B3', 'SR_B6'])
  .rename('MNDWI');

print('NDVI Statistics:', ndvi.reduceRegion({
  reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), null, true),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
}));

print('NDBI Statistics:', ndbi.reduceRegion({
  reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), null, true),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
}));

print('MNDWI Statistics:', mndwi.reduceRegion({
  reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), null, true),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
}));

Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['white','green']}, 'NDVI');
Map.addLayer(ndbi, {min: -0.5, max: 0.5, palette: ['white','red']}, 'NDBI');
Map.addLayer(mndwi, {
  min: -0.5, max: 0.5,
  palette: ['#d7191c','#ffffbf','#2c7bb6']
}, 'MNDWI');

// ============================================================
// SECTION 6: CORRELATION ANALYSIS
// ============================================================
var corrNDVI = uhi.addBands(ndvi).reduceRegion({
  reducer: ee.Reducer.pearsonsCorrelation(),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
});
print('Pearson Correlation - UHI vs NDVI:', corrNDVI);

var corrNDBI = uhi.addBands(ndbi).reduceRegion({
  reducer: ee.Reducer.pearsonsCorrelation(),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
});
print('Pearson Correlation - UHI vs NDBI:', corrNDBI);

var corrMNDWI = uhi.addBands(mndwi).reduceRegion({
  reducer: ee.Reducer.pearsonsCorrelation(),
  geometry: chennai.geometry(), scale: 30, maxPixels: 1e9
});
print('Pearson Correlation - UHI vs MNDWI:', corrMNDWI);

// ============================================================
// SECTION 7: UHI CLASSIFICATION (5 CLASSES)
// Based on standard deviation thresholds
// 1 = Severe Cool Island  (<-1.5 SD)
// 2 = Moderate Cool Island (-1.5 to -0.5 SD)
// 3 = Neutral (-0.5 to +0.5 SD)
// 4 = Moderate Heat Island (+0.5 to +1.5 SD)
// 5 = Severe Heat Island (>+1.5 SD)
// ============================================================
var uhiStdDev = ee.Number(uhi.reduceRegion({
  reducer: ee.Reducer.stdDev(),
  geometry: chennai.geometry(),
  scale: 30,
  maxPixels: 1e9
}).get('UHI_Intensity'));

print('UHI Standard Deviation:', uhiStdDev);

var uhiClass = ee.Image(1)
  .where(uhi.gt(uhiStdDev.multiply(-0.5)), 2)
  .where(uhi.gt(uhiStdDev.multiply(0.5)), 3)
  .where(uhi.gt(uhiStdDev.multiply(1.5)), 4)
  .where(uhi.gt(uhiStdDev.multiply(2.5)), 5)
  .rename('UHI_Class')
  .clip(chennai.geometry())
  .toByte();

Map.addLayer(uhiClass, {
  min:1, max:5,
  palette:['#313695','#74add1','#ffffbf','#f46d43','#a50026']
}, 'UHI Classification (5 Class)');

var uhiClassStats = uhiClass.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: chennai.geometry(),
  scale: 30,
  maxPixels: 1e13
});
print('UHI Class Distribution (1=Cool to 5=Severe Heat):', uhiClassStats);

// ============================================================
// SECTION 8: EXPORT TO GOOGLE DRIVE
// CRS: EPSG:32644 (UTM Zone 44N - correct for Chennai)
// ============================================================
var chennaiMask = ee.Image.constant(1)
  .clip(chennai.geometry()).mask();

// Export 1: UHI intensity (continuous)
Export.image.toDrive({
  image: uhi.updateMask(chennaiMask),
  description: 'Chennai_UHI_Intensity_2025',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Chennai_UHI_2025',
  region: chennai.geometry(),
  scale: 30,
  crs: 'EPSG:32644',
  maxPixels: 1e9
});

// Export 2: UHI with mask
var uhi_masked = uhi.updateMask(uhi.mask());
Export.image.toDrive({
  image: uhi_masked.updateMask(chennaiMask),
  description: 'Chennai_UHI_Masked_2025',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Chennai_UHI_2025_masked',
  region: chennai.geometry(),
  scale: 30,
  crs: 'EPSG:32644',
  maxPixels: 1e9
});

// Export 3: LST in Celsius
Export.image.toDrive({
  image: lst.updateMask(chennaiMask),
  description: 'Chennai_LST_Celsius_2025',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Chennai_LST_2025',
  region: chennai.geometry(),
  scale: 30,
  crs: 'EPSG:32644',
  maxPixels: 1e9
});

// Export 4: UHI 5-class map
Export.image.toDrive({
  image: uhiClass.updateMask(chennaiMask),
  description: 'Chennai_UHI_5Class_2025',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Chennai_UHI_5Class_2025',
  region: chennai.geometry(),
  scale: 30,
  crs: 'EPSG:32644',
  maxPixels: 1e9
});

// Export 5: Spectral indices
var indicesComposite = ndvi.addBands(ndbi).addBands(mndwi).addBands(lst);
Export.image.toDrive({
  image: indicesComposite.updateMask(chennaiMask),
  description: 'Chennai_Spectral_Indices_2025',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Chennai_Indices_2025',
  region: chennai.geometry(),
  scale: 30,
  crs: 'EPSG:32644',
  maxPixels: 1e9
});
