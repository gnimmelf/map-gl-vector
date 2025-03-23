import * as GeoTIFF from 'geotiff';
import { flags } from './utils';

type DemType = Awaited<ReturnType<typeof loadElevationData>>

// Bilinear interpolation for smoother elevation lookup
function sampleDEM(xIndex: number, yIndex: number, DEM: DemType) {

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

async function loadElevationData(url: string) {
  // Load TIFF file
  const tiff = await GeoTIFF.fromUrl(url);
  const image = await tiff.getImage();

  // Read elevation data
  const rasters = await image.readRasters({ samples: [0] });
  const width = image.getWidth();
  const height = image.getHeight();

  const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();
  const lonRange = (maxLon - minLon);
  const latRange = (maxLat - minLat);

  return {
    raster: rasters[0] as GeoTIFF.TypedArray, // Assuming a single-band DEM
    width,
    height,
    lonRange,
    latRange
  };
}

export type ElevationOptions = {
  displacementScale: number
}

export class ElevationMap {
  url: URL
  displacementScale: number
  DEM!: DemType

  constructor(url: URL, options: ElevationOptions) {
    this.url = url
    this.displacementScale = options.displacementScale
  }

  async asyncInit() {
    this.DEM = await loadElevationData(this.url.href);
  }

  getElevationAt(coordinate: [number, number], scale: { width: number, height: number }): number {
    // Scale to local plane coodinates to DEM
    const rasterX = Math.round(coordinate[0] / scale.width * this.DEM.width)
    // Invert raster y-axis so that DEM[0,0] matches plane lower-left [0, 0]
    const rasterY = Math.round(((scale.height - coordinate[1]) / scale.height) * this.DEM.height);

    if (flags.sampleDEM) {
      const elevation = Math.max(sampleDEM(rasterX, rasterY, this.DEM), 1) / this.displacementScale
      return elevation
    }

    /**
     * Compute the index in the 1D elevation array.
     * Heigh * width + the current x index
     */
    const rasterIdx = (rasterY * this.DEM.width) + rasterX;

    /**
     * Modulate the rasterVal (Meters above sealevel)
     */
    const rasterVal = Math.max(this.DEM.raster[rasterIdx], 1) / this.displacementScale
    return rasterVal
  }
}

