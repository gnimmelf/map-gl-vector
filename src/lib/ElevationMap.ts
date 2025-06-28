import { DemType, loadElevationData, sampleDEM } from "./geo-utils"
import { flags } from "./utils"

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
    console.log({ DEM: this.DEM })
  }

  getElevationAt(coordinate: [number, number], map: { width: number, height: number }): number {
    // Scale local plane coodinates to DEM
    const rasterX = Math.floor((coordinate[0] / map.width) * this.DEM.width - 1)
    // Invert raster y-axis so that DEM[0,0] matches plane lower-left [0, 0]
    const rasterY = Math.floor(((map.height - coordinate[1]) / map.height) * this.DEM.height - 1);

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

