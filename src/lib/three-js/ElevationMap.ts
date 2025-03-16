import * as GeoTIFF from 'geotiff';
import { Sampler } from "../utils";
import { Bounds } from '../GeoProjector';
import proj4 from 'proj4';

const sampler = new Sampler('ElevationMap')

export type ElevationOptions = {
    bounds: Bounds
    displacementScale?: number
}

export class ElevationMap {
    url: URL
    displacementScale: number
    bounds: Bounds
    tiff!: {
        minLat: number
        maxLat: number
        minLng: number
        maxLng: number
        width: number
        height: number
        raster: GeoTIFF.ReadRasterResult
    }
    mapProjection!: string

    constructor(url: URL, options: ElevationOptions) {
        this.url = url
        this.displacementScale = options.displacementScale || 50
        this.bounds = options.bounds
    }

    async asyncInit() {
        const tiff = await GeoTIFF.fromUrl(this.url.href);
        const image = await tiff.getImage();
        // Extract image meta data
        const geoKeys = image.getGeoKeys()
        this.mapProjection = `EPSG:${geoKeys.GeographicTypeGeoKey}`
        // Extract image data
        const [minLat, minLng, maxLat, maxLng] = image.getBoundingBox(false);
        const width = image.getWidth();
        const height = image.getHeight();
        const raster = await image.readRasters({ samples: [0] });
        this.tiff = {
            minLat,
            maxLat,
            minLng,
            maxLng,
            width,
            height,
            raster
        }
        console.log('tiff', this.tiff, geoKeys)
        return this
    }

    getElevationAt(latLng: [number, number], toProjection: string): number {
        // Project from latLng to the tiff's projection
        const [lat, lng] = this.mapProjection !== toProjection
            ? proj4(this.mapProjection, toProjection, latLng)
            : latLng;

        const { width, height } = this.tiff;
        const { minLat, maxLat, minLng, maxLng } = this.bounds;

        // Normalization
        const x = Math.floor(((lng - minLng) / (maxLng - minLng)) * width);
        // const y = Math.floor(((maxLat - lat) / (maxLat - minLat)) * height); // Inverted Y-axis
        const y = Math.floor(((lat - minLat ) / (maxLat - minLat)) * height);

        //@ts-expect-error
        const elevationValue = this.tiff.raster[0][y * width + x];

        sampler.log(() => {
            sampler.count++
            if (!(elevationValue != -9999 && sampler.count < 20)) return
            console.log(sampler.label, y * width + x, elevationValue, { lat, lng }, { minLat, maxLat, minLng, maxLng, width, height })
        })

        return Math.max(elevationValue, 0)

        // Scale elevation based on displacementScale
        return (elevationValue / 255.0) * this.displacementScale;
    }
}