import { fromUrl, GeoTIFF } from 'geotiff';

import { dir } from '../utils'

type TypedIntArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;

type TypedFloatArray = Uint16Array | Float32Array | Float64Array;

export type TypedArray = TypedIntArray | TypedFloatArray

export type GeoTIFFData = {
    crs?: string;
    bounds: number[];
    metadata: Record<string, unknown>;

    width: number;
    height: number;
    data: TypedArray;
};

/** GeoTIFF load options */
export type GeoTIFFLoaderOptions = {
    enableAlpha?: boolean
    interleave?: boolean
    band?: number | null
}

/**
 * GeoTiffLoader
 */
export class GeoTiffLoader {
    url: string
    options: GeoTIFFLoaderOptions
    tiff: Promise<GeoTIFFData>

    constructor(url: string, options: GeoTIFFLoaderOptions) {
        this.url = url
        this.options = Object.assign({
            enableAlpha: false,
            interleave: false,
            band: null
        }, options)
        // Start loading
        this.tiff = this.#fetch()
    }

    async #fetch() {
        const tiff = await fromUrl(this.url);
        return this.#parse(tiff)
    }

    async #parse(
        tiff: GeoTIFF,
    ): Promise<GeoTIFFData> {
        // Assumes we only have one image inside TIFF
        const image = await tiff.getImage();
        const width = image.getWidth();
        const height = image.getHeight();

        let elevationData;
        if (isNaN(parseInt(this.options?.band as any))) {
            // Read the raster data for rgb-band
            console.log('readRGB')
            elevationData = await image.readRGB({
                enableAlpha: this.options.enableAlpha
            });
        }
        else {
            // Read the raster data (all bands)
            console.log('readRaster')
            const rasters = await image.readRasters({
                interleave: this.options.interleave,
            });
            //@ts-ignore - Get band
            elevationData = rasters[this.options.band] as TypedArray

            // Handle NoData values, if needed
            const noDataValue = image.getGDALNoData();

            // Normalize elevation
            let minElevation = Number.MAX_SAFE_INTEGER
            let maxElevation = 0
            for (let i = 0; i < elevationData.length; i++) {
                if (elevationData[i] === noDataValue) {
                    elevationData[i] = 0
                }
                minElevation = Math.min(minElevation, elevationData[i]);
                maxElevation = Math.max(maxElevation, elevationData[i]);
            }
            for (let i = 0; i < elevationData.length; i++) {
                elevationData[i] = ((elevationData[i] - minElevation) / (maxElevation - minElevation)) * 255;
            }
            console.log({ noDataValue, minElevation, maxElevation})
        }

        // Get geo data
        const bounds = image.getBoundingBox();
        const metadata = image.getGeoKeys();

        // ProjectedCSTypeGeoKey is the only key we support for now, we assume it is an EPSG code
        let crs: string | undefined;
        if (metadata?.ProjectedCSTypeGeoKey) {
            crs = `EPSG:${metadata.ProjectedCSTypeGeoKey}`;
        }

        // Return GeoReferenced image data
        return {
            crs,
            bounds,
            width,
            height,
            data: elevationData as TypedArray,
            metadata
        };
    }
}



