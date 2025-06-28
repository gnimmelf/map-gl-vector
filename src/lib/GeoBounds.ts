import proj4 from 'proj4'

export type GeoBoundsOptions = {
    x: { min: number, max: number }
    y: { min: number, max: number }
}

export class GeoBounds {
    crsName: string
    x: { min: number, max: number }
    y: { min: number, max: number }
    xRange: number
    yRange: number
    ratio: number

    constructor(crsName: string, options: GeoBoundsOptions) {
        this.crsName = crsName
        this.x = options.x
        this.y = options.y
        this.xRange = this.x.max - this.x.min
        this.yRange = this.y.max - this.y.min
        this.ratio = this.xRange / this.yRange
    }

    static fromBounds(srcBounds: GeoBounds, options: {
        trgtCrsName: string,
    }) {
        const [xMin, yMin] = proj4(srcBounds.crsName, options.trgtCrsName, [srcBounds.x.min, srcBounds.y.min])
        const [xMax, yMax] = proj4(srcBounds.crsName, options.trgtCrsName, [srcBounds.x.max, srcBounds.y.max])
        return new GeoBounds(options.trgtCrsName, {
            x: { min: xMin, max: xMax},
            y: { min: yMin, max: yMax},
        })
    }
}
