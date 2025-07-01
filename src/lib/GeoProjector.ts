import proj4 from "proj4"
import { GeoBounds } from "./GeoBounds"

export type GeoProjectorOptions = {
  trgtCrsName: string
  trgtBounds: GeoBounds
  mapWidth: number
  mapHeight?: number
}

export class GeoProjector {
  srcBounds: GeoBounds
  trgtBounds: GeoBounds
  mapWidth: number
  mapHeight: number
  #converter: proj4.Converter

  constructor(srcBounds: GeoBounds, options: GeoProjectorOptions) {
    this.srcBounds = srcBounds
    this.mapWidth = options.mapWidth || 1000

    // Calculate projection bounds
    this.trgtBounds = options.trgtBounds || GeoBounds.fromBounds(srcBounds, {
      trgtCrsName: options.trgtCrsName,
    })
    this.mapHeight = this.mapWidth * this.trgtBounds.ratio
    // Projector
    this.#converter = proj4(this.srcBounds.crsName, this.trgtBounds.crsName);
    console.log(this)
  }

  get forward() {
    return this.#converter.forward
  }

  get inverse() {
    return this.#converter.inverse
  }

  forwardToLocal(coordinates: number[]) {
    const localCoords = this.#converter.forward(coordinates)
    return this.normalize(localCoords)
  }

  normalize(localCoords: number[]) {
    /**
     * Normalize to bottom-left [0,0], top-right [1,1] and
     * then scale to bottom-left [0,0], top-right [mapWidth, mapHeight]
     */
    return [
      ((localCoords[0] - this.trgtBounds.x.min) / this.trgtBounds.xRange) * this.mapWidth,
      ((localCoords[1] - this.trgtBounds.y.min) / this.trgtBounds.yRange) * this.mapHeight,
    ]
  }
}