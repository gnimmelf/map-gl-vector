//@ts-expect-error
import Martini from '@mapbox/martini'
import { DemType } from "./geo-utils"

function isPowerOfTwoPlusOne(size: number) {
  return (size & (size - 1)) === 1; // Checks if size-1 is a power of 2
}

function resampleRaster({ raster, width, height }: DemType, targetSize = 257) {
  const resampled = new Float32Array(targetSize * targetSize);

  // Bilinear interpolation
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      // Map output (x, y) to input coordinates
      const srcX = (x / (targetSize - 1)) * (width - 1);
      const srcY = (y / (targetSize - 1)) * (height - 1);

      // Bilinear interpolation
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, width - 1);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(y0 + 1, height - 1);

      const fx = srcX - x0;
      const fy = srcY - y0;

      // Get four corner values
      const v00 = raster[x0 + y0 * width];
      const v10 = raster[x1 + y0 * width];
      const v01 = raster[x0 + y1 * width];
      const v11 = raster[x1 + y1 * width];

      // Interpolate
      const value =
        (1 - fx) * (1 - fy) * v00 +
        fx * (1 - fy) * v10 +
        (1 - fx) * fy * v01 +
        fx * fy * v11;

      resampled[x + y * targetSize] = value;
    }
  }
  return resampled
}

export function createMartiniMesh(DEM: DemType, gridSize = 257) {
  let raster = DEM.raster;
  // Ensure the grid is square and (2k+1) × (2k+1)
  if (DEM.width !== DEM.height || !isPowerOfTwoPlusOne(DEM.width)) {
    // TODO! Resample raster
    raster = resampleRaster(DEM)

  }

  // Initialize Martini with the grid size
  const martini = new Martini(gridSize);

  // Create a Float32Array for Martini (it expects float32)
  const terrain = new Float32Array(gridSize * gridSize);
  terrain.set(new Float32Array(raster));

  // Generate the mesh
  const mesh = martini.createTile(terrain);

  // Return mesh data (vertices and triangles)
  return mesh as ArrayBufferLike;
}