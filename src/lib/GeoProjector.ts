import proj4 from "proj4"
import { GeoBounds } from "./GeoBounds"

export type GeoProjectorOptions = {
    toCrs: string
    mapWidth: number
    mapHeight?: number
}

export class GeoProjector {
    fromBounds: GeoBounds
    toBounds: GeoBounds
    mapWidth: number
    mapHeight: number
    #converter: proj4.Converter

    constructor(fromBounds: GeoBounds, options: GeoProjectorOptions) {
        this.fromBounds = fromBounds
        this.mapWidth = options.mapWidth || 1000

        // Calculate projection bounds
        this.toBounds = GeoBounds.fromBounds(fromBounds, {
            toCrsName: options.toCrs || 'EPSG:25832',
            axisLabels: { x: "easting", y: "northing" },
        })
        this.mapHeight = this.mapWidth * this.toBounds.ratio
        // Projector
        this.#converter = proj4(this.fromBounds.crsName, this.toBounds.crsName);
        console.log(this)
    }

    get forward() {
        return this.#converter.forward
    }

    get inverse() {
        return this.#converter.inverse
    }

    forwardToLocal(coordinates: number[]) {
        const converted = this.#converter.forward(coordinates)
        /**
         * Normalize to bottom-left [0,0], top-right [1,1] and
         * then scale to bottom-left [0,0], top-right [mapWidth, mapHeight]
         */
        return [
            ((converted[0] - this.toBounds.x.min) / this.toBounds.xRange) * this.mapWidth,
            ((converted[1] - this.toBounds.y.min) / this.toBounds.yRange) * this.mapHeight,
        ]
    }
}