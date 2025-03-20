import proj4 from 'proj4'
import { dir } from './utils';

proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

dir(proj4.defs)

export type Bounds = {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
}

export type GeoProjectorOptions = {
    fromProjection: string
    toProjection: string
    mapWidth: number
    mapHeight?: number
}

export class GeoProjector {
    fromBounds: Bounds
    bounds: Bounds
    latRange: number
    lngRange: number

    options: GeoProjectorOptions

    constructor(fromBounds: Bounds, options?: GeoProjectorOptions) {
        this.options = Object.assign({
            fromProjection: 'EPSG:4326',
            toProjection: 'EPSG:25832',
            mapWidth: 1000
        }, options || {})

        this.fromBounds = fromBounds

        // UpperLeftCorner
        const [maxLat, maxLng] = proj4(
            this.options.fromProjection!,
            this.options.toProjection!,
            [fromBounds.maxLat, fromBounds.maxLng])
        // LowerRightCorner
        const [minLat, minLng] = proj4(
            this.options.fromProjection!,
            this.options.toProjection!,
            [fromBounds.minLat, fromBounds.minLng])

        this.bounds = { minLat, minLng, maxLat, maxLng }

        this.latRange = this.bounds.maxLat - this.bounds.minLat
        this.lngRange = this.bounds.maxLng - this.bounds.minLng

        if (!this.options.mapHeight) {
            this.options.mapHeight = (this.options.mapWidth! * this.latRange / this.lngRange);
        }

        console.log(this)

        // Bind method contexts
        this.normalize = this.normalize.bind(this)
    }

    normalize(lngLat: [number, number]): [number, number] {
        const [lng, lat] = proj4(this.options.fromProjection!, this.options.toProjection!, lngLat)
        // Normalization
        const x = ((lng - this.bounds.minLng) / this.lngRange) * (this.options.mapWidth! - 1);
        const y = ((lat - this.bounds.maxLat) / this.latRange) * (this.options.mapHeight! - 1);
        return [x, y]
    }
}