import proj4 from 'proj4'
import { dir } from './utils';
import { TypedArray } from 'geotiff';

proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

dir(proj4.defs)

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
        console.log(this)
    }
}

// Bilinear interpolation for smoother elevation lookup
export function sampleDEM(lon: number, lat: number, raster: TypedArray, width: number, height: number, bbox: number[]) {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    // Normalize lat/lon to grid indices
    const xRatio = (lon - minLon) / (maxLon - minLon);
    const yRatio = (lat - minLat) / (maxLat - minLat);

    const xIndex = xRatio * (width - 1);
    const yIndex = (1 - yRatio) * (height - 1); // Flip Y-axis for raster indexing

    // Get integer indices and fractions
    const x0 = Math.floor(xIndex);
    const x1 = Math.min(x0 + 1, width - 1);
    const y0 = Math.floor(yIndex);
    const y1 = Math.min(y0 + 1, height - 1);
    const xFrac = xIndex - x0;
    const yFrac = yIndex - y0;

    // Bilinear interpolation
    const v00 = raster[y0 * width + x0];
    const v10 = raster[y0 * width + x1];
    const v01 = raster[y1 * width + x0];
    const v11 = raster[y1 * width + x1];

    return (v00 * (1 - xFrac) * (1 - yFrac)) +
        (v10 * xFrac * (1 - yFrac)) +
        (v01 * (1 - xFrac) * yFrac) +
        (v11 * xFrac * yFrac);
}