import * as GeoTIFF from 'geotiff';
import { flags, Sampler } from "./utils";
import { Bounds } from './GeoProjector';
import proj4 from 'proj4';

const sampler = new Sampler('ElevationMap')

async function loadElevationData(url: string) {
    // Load TIFF file
    const tiff = await GeoTIFF.fromUrl(url);
    const image = await tiff.getImage();

    // Extract image meta data
    const geoKeys = image.getGeoKeys()
    console.log({ geoKeys })
    const projection = `EPSG:${geoKeys.GeographicTypeGeoKey}`
    const [minLat, minLng, maxLat, maxLng] = image.getBoundingBox(false);
    const bounds = { minLat, minLng, maxLat, maxLng };

    // Read elevation data
    const rasters = await image.readRasters({ samples: [0] });
    const width = image.getWidth();
    const height = image.getHeight();


    return { rasters, width, height, projection, bounds };
}

export type ElevationOptions = {
    bounds: Bounds
    displacementScale: number
    projection?: string
}

export class ElevationMap {
    url: URL
    options: ElevationOptions
    displacementScale: number
    tiff!: {
        projection: string
        bounds?: Bounds
        width: number
        height: number
        rasters: GeoTIFF.ReadRasterResult
    }
    projection!: string
    bounds!: Bounds
    latRange!: number
    lngRange!: number

    constructor(url: URL, options: ElevationOptions) {
        this.url = url
        this.options = options
        this.displacementScale = this.options.displacementScale
    }

    async asyncInit() {
        this.tiff = await loadElevationData(this.url.href);
        this.projection = this.tiff.projection || this.options.projection || ''
        this.bounds = this.tiff.bounds || this.options.bounds

        console.assert(this.projection, 'Missing projection')
        console.assert(this.bounds, 'Missing bounds')

        this.latRange = this.bounds.maxLat - this.bounds.minLat
        this.lngRange = this.bounds.maxLng - this.bounds.minLng
        // TODO! If `tiff.bounds`, assert that equal to `this.bounds`
        console.log({
            minLat: [this.bounds.minLat, this.tiff.bounds?.minLat],
            minLng: [this.bounds.minLng, this.tiff.bounds?.minLng],
            maxLat: [this.bounds.maxLat, this.tiff.bounds?.maxLat],
            maxLng: [this.bounds.maxLng, this.tiff.bounds?.maxLng]
        })
        return this
    }

    getElevationAt(lngLat: [number, number], toProjection: string): number {
        // Project from latLng to the tiff's projection
        const [lng, lat] = this.projection !== toProjection
            ? proj4(this.projection, toProjection, lngLat)
            : lngLat;

        const x = ((lng - this.bounds.minLng) / this.lngRange) * (this.tiff.width! - 1);
        const y = ((lat - this.bounds.maxLat) / this.latRange) * (this.tiff.height! - 1);

        const rasterIdx = (x * this.tiff.width) + y;

        //@ts-expect-error
        const elevationValue = Math.max(Math.floor(this.tiff.rasters[0][rasterIdx]), 0);

        sampler.log((inst) => {
            if (inst.count > 20 && isNaN(elevationValue)) return
            inst.count++
            console.log(inst.label, {
                elevationValue,
                fromProjection: this.projection,
                toProjection,
                lngLat,
                coords: [x, y],
                lngLatTo: [lng, lat],
                bounds: this.bounds,
                lngRange: this.lngRange,
                latRange: this.latRange,
            })
        })

        // Scale elevation based on displacementScale
        return Math.round(elevationValue || 0 / this.displacementScale);
    }
}