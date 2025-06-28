import * as GeoTIFF from 'geotiff';
import proj4 from 'proj4'
import { GeoBounds } from './GeoBounds';

proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

export type DemType = Awaited<ReturnType<typeof loadElevationData>>

// Bilinear interpolation for smoother elevation lookup
export function sampleDEM(xIndex: number, yIndex: number, DEM: DemType) {

  // Get integer indices and fractions
  const x0 = Math.floor(xIndex);
  const x1 = Math.min(x0 + 1, DEM.width - 1);
  const y0 = Math.floor(yIndex);
  const y1 = Math.min(y0 + 1, DEM.height - 1);
  const xFrac = xIndex - x0;
  const yFrac = yIndex - y0;

  // Bilinear interpolation
  const v00 = DEM.raster[y0 * DEM.width + x0];
  const v10 = DEM.raster[y0 * DEM.width + x1];
  const v01 = DEM.raster[y1 * DEM.width + x0];
  const v11 = DEM.raster[y1 * DEM.width + x1];

  return (v00 * (1 - xFrac) * (1 - yFrac)) +
      (v10 * xFrac * (1 - yFrac)) +
      (v01 * (1 - xFrac) * yFrac) +
      (v11 * xFrac * yFrac);
}

export async function loadElevationData(url: string) {
  // Load TIFF file
  const tiff = await GeoTIFF.fromUrl(url);
  const image = await tiff.getImage();

  // Read elevation data
  const rasters = await image.readRasters({ samples: [0] });
  const width = image.getWidth();
  const height = image.getHeight();

  const {
    GeographicTypeGeoKey
  } = image.getGeoKeys()

  const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();
  const bounds = new GeoBounds(`EPSG:${GeographicTypeGeoKey}`, {
    x: { min: minLon, max: maxLon },
    y: { min: minLat, max: maxLat }
  })

  return {
    raster: rasters[0] as GeoTIFF.TypedArray, // Assuming a single-band DEM
    width,
    height,
    bounds
  };
}
