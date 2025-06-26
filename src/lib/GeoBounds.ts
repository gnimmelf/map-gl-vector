import proj4 from 'proj4'

export type GeoBoundsOptions = {
    axisLabels: { x: string, y: string }
    x: { min: number, max: number }
    y: { min: number, max: number }
}

export class GeoBounds {
    crsName: string
    axisLabels: { x: string, y: string }
    x: { min: number, max: number }
    y: { min: number, max: number }
    xRange: number
    yRange: number
    ratio: number

    constructor(crsName: string, options: GeoBoundsOptions) {
        this.crsName = crsName
        this.axisLabels = options.axisLabels
        this.x = options.x
        this.y = options.y
        this.xRange = this.x.max - this.x.min
        this.yRange = this.y.max - this.y.min
        this.ratio = this.xRange / this.yRange
    }

    static fromBounds(fromBounds: GeoBounds, options: {
        toCrsName: string,
        axisLabels: { x: string, y: string }
    }) {
        const [xMin, yMin] = proj4(fromBounds.crsName, options.toCrsName, [fromBounds.x.min, fromBounds.y.min])
        const [xMax, yMax] = proj4(fromBounds.crsName, options.toCrsName, [fromBounds.x.max, fromBounds.y.max])
        return new GeoBounds(options.toCrsName, {
            axisLabels: options.axisLabels,
            x: { min: xMin, max: xMax},
            y: { min: yMin, max: yMax},
        })
    }
}
