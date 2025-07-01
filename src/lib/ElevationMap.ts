import proj4 from "proj4"
import {
  DemType,
  loadElevationData,
  sampleDEM
} from "./geo-utils"

export type ElevationOptions = {
  displacementScale: number
}

export class ElevationMap {
  url: URL
  displacementScale: number
  DEM!: DemType
  #converter!: proj4.Converter
  martiniMesh!: ArrayBufferLike

  constructor(url: URL, options: ElevationOptions) {
    this.url = url
    this.displacementScale = options.displacementScale
  }

  async asyncInit(trgtCrsName: string) {
    const DEM = await loadElevationData(this.url.href);

    console.log({ trgtCrsName, DEM })

    this.DEM = DEM
    // NOTE! This should not work - it should need to convert to projection `trgtCrsName`
    this.#converter = proj4(DEM.bounds.crsName);
  }

  getElevationAt(coordinate: [number, number]): number {
    return this.getElevationAtLocal(this.#converter.forward(coordinate))
  }

  getElevationAtLocal(coordinate: [number, number]): number {
    // Map coordinate to DEM pixel grid
    const rasterX = Math.floor(((coordinate[0] - this.DEM.bounds.x.min) / this.DEM.bounds.xRange) * this.DEM.width);
    const rasterY = Math.floor(((this.DEM.bounds.y.max - coordinate[1]) / this.DEM.bounds.yRange) * this.DEM.height); // Invert y-axis

    // Compute index
    const rasterIdx = (rasterY * this.DEM.width) + rasterX;

    // Get elevation
    const elevation = this.DEM.raster[rasterIdx]
    // const elevation = sampleDEM(rasterX, rasterY, this.DEM)
    return Math.max(elevation, 1) * this.displacementScale / 100;
  }
}

