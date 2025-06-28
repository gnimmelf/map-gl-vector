import proj4 from "proj4"
import { DemType, loadElevationData, sampleDEM } from "./geo-utils"
import { flags } from "./utils"

export type ElevationOptions = {
  displacementScale: number
}

export class ElevationMap {
  url: URL
  displacementScale: number
  DEM!: DemType
  #converter!: proj4.Converter

  constructor(url: URL, options: ElevationOptions) {
    this.url = url
    this.displacementScale = options.displacementScale
  }

  async asyncInit(trgtCrsName: string) {
    this.DEM = await loadElevationData(this.url.href);
    this.#converter = proj4(this.DEM.bounds.crsName, trgtCrsName);
    console.log({ DEM: this.DEM })
  }

getElevationAt(coordinate: [number, number], map: { width: number, height: number }): number {
    const converted = this.#converter.forward(coordinate)

    // Map EPSG:25832 to DEM pixel grid
    const rasterX = Math.floor(((converted[0] - this.DEM.bounds.x.min) / this.DEM.bounds.xRange) * this.DEM.width);
    const rasterY = Math.floor(((this.DEM.bounds.y.max - converted[1]) / this.DEM.bounds.yRange) * this.DEM.height); // Invert y-axis

    // Compute index
    const rasterIdx = (rasterY * this.DEM.width) + rasterX;

    // Get elevation
    const rasterVal = Math.max(this.DEM.raster[rasterIdx], 1) / this.displacementScale;
    return rasterVal;
}
}

