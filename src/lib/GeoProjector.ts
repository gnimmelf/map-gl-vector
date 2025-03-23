import proj4 from 'proj4'

proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

export type BoundsOptions = {
    axisLabels: { x: string, y: string }
    x: { min: number, max: number }
    y: { min: number, max: number }
}

export class Bounds {
    crsName: string
    axisLabels: { x: string, y: string }
    x: { min: number, max: number }
    y: { min: number, max: number }
    xRange: number
    yRange: number
    mapRatio: number

    constructor(crsName: string, options: BoundsOptions) {
        this.crsName = crsName
        this.axisLabels = options.axisLabels
        this.x = options.x
        this.y = options.y
        this.xRange = this.x.max - this.x.min
        this.yRange = this.y.max - this.y.min
        this.mapRatio = this.xRange / this.yRange
    }
}

export type GeoProjectorOptions = {
    toCrs: string
    mapWidth: number
    mapHeight?: number
}

export class GeoProjector {
    fromBounds: Bounds
    toBounds: Bounds
    mapWidth: number
    mapHeight: number
    #converter: proj4.Converter

    constructor(fromBounds: Bounds, options: GeoProjectorOptions) {
        this.fromBounds = fromBounds
        this.mapWidth = options.mapWidth || 1000

        // Calculate projection bounds
        const toCrs = options.toCrs || 'EPSG:25832'
        const [xMin, yMin] = proj4(fromBounds.crsName, toCrs, [fromBounds.x.min, fromBounds.y.min])
        const [xMax, yMax] = proj4(fromBounds.crsName, toCrs, [fromBounds.x.max, fromBounds.y.max])
        this.toBounds = new Bounds(toCrs, {
            axisLabels: { x: "easting", y: "northing" },
            x: {
                min: xMin,
                max: xMax
            },
            y: {
                min: yMin,
                max: yMax
            }
        })
        this.mapHeight = this.mapWidth * this.toBounds.mapRatio
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