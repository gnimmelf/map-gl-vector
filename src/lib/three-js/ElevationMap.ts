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
        minX: number
        minY: number
        maxX: number
        maxY: number
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
        const [minX, minY, maxX, maxY] = image.getBoundingBox();
        const width = image.getWidth();
        const height = image.getHeight();
        const raster = await image.readRasters({ samples: [0] });
        this.tiff = {
            minX,
            minY,
            maxX,
            maxY,
            width,
            height,
            raster
        }
        return this
    }

    getElevationAt(latLng: [number, number], toProjection: string): number {
        // Project from latLng to the tiff's projection
        const [lat, lng] = this.mapProjection !== toProjection
            ? proj4(this.mapProjection, toProjection, latLng)
            : latLng;

        const { minX, minY, maxX, maxY, width, height, raster } = this.tiff;

        const x = Math.floor(((lng - minX) / (maxX - minX)) * width);
        const y = Math.floor(((lat - minY) / (maxY - minY)) * height);

        // Extract the elevation data at the calculated pixel location
        const elevationValue = raster[0][y * width + x];

        sampler.log((count) => {
            return count % 100 == 0
        }, {
            latLng,
            coord: [x, y],
            elevationValue,
            minX, minY, maxX, maxY, width, height, raster
        })

        return elevationValue || 0

        // Scale elevation based on displacementScale
        return (elevationValue / 255.0) * this.displacementScale;
    }
}