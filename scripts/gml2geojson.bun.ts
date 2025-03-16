import { $ } from "bun";
import { readdir } from "node:fs/promises"
import { XMLParser } from 'fast-xml-parser'
import { JSONPath } from 'jsonpath-plus';
import proj4 from 'proj4'

// TODO! Figure out how to import this dynamically to allow for multiple area-configs
import {
    SOURCE_DIR,
    DEST_DIR,
    DEST_FILE_PREFIX,
    FILE_FEATURES,
    FeatureConfig,
    Geometries
} from './gml2geoJson.config.hurdal'

const dir = (obj: any, depth = 0) => console.dir(obj, { depth })

const GEOJSON_CRS_NAME = 'EPSG:4326' // aka "WGS 84"

const getFilepath = (dir: string, filename: string) => {
    return `${dir}/${filename}`.replace('//', '/')
}

const posList2PairsList = (posList: string, crsName: string) => {
    const arr = posList.split(' ')
    if (arr.length % 2 !== 0) {
        throw new Error(`Poslist length invalid (Length not even)`)
    }
    let result = [];
    for (let i = 0; i < arr.length; i += 2) {
        const coordinates = [parseFloat(arr[i]), parseFloat(arr[i + 1])]
        result.push(proj4(crsName, GEOJSON_CRS_NAME, coordinates));
    }
    return result;
}

const parseCrsName = (crsUrn: string) => {
    const [rest, code] = crsUrn.split('::')
    return [rest.split(':').pop(), code].join(':')
}

/**
 * 1. Only `filename`: Returns `true` if the file-features-config includes `filename`
 * 2. `filename` and `featurename`: Returns `true` if the file-features-config includes
 *    `filename`, `featurename` is included in the file-`features`.
 * @param filename
 * @param featurename
 * @returns boolean
 */
const filterFileFeature = (filename: string, featurename?: string) => {
    return FILE_FEATURES.find((file) => {
        let isMatch = file.filename === filename
        if (isMatch && featurename) {
            isMatch = !!file.features.find(({ name }) => name === featurename)
        }
        return isMatch
    })
}

const getFileFeatureConfig = (filename: string, featurename: string) => {
    const file = FILE_FEATURES.find((file) => file.filename === filename)
    return file?.features.find((feature) => feature.name === featurename)
}

const parseNumberList = (numberlist: string) => numberlist.split(' ').map((n: string) => parseFloat(n))

class Feature {
    type = 'Feature'
    properties = {
        gml_id: '',
    }
    geometry!: {
        type: string
        coordinates: number[] | number[][]
    }

    constructor(gmlId: string) {
        this.properties['gml_id'] = gmlId
    }

    setGeometry(json: any, geometries: Geometries[], crsName: string) {
        let gml;
        if (geometries.includes(Geometries.Polygon) &&
            (gml = JSONPath({ path: '$..gml:Surface', json })) &&
            gml.length
        ) {
            this.#addPolygon(gml, crsName)
        }
        else if (geometries.includes(Geometries.LineString) &&
            (gml = JSONPath({ path: '$..gml:LineString', json }))
            && gml.length
        ) {
            this.#addLineString(gml, crsName)
        }
        else if (geometries.includes(Geometries.Point) &&
            (gml = JSONPath({ path: '$..gml:Point', json })) &&
            gml.length
        ) {
            this.#addPoint(gml, crsName)
        }
    }

    #addPolygon(json: any, crsName: string) {
        const extPosList = JSONPath({ path: '$..gml:exterior..gml:posList', json }).pop()
        const intPosLists = JSONPath({ path: '$..gml:interior..gml:posList', json })
        this.geometry = {
            type: 'Polygon',
            coordinates: [
                posList2PairsList(extPosList, crsName),
                ...intPosLists.map((posList: any) => posList2PairsList(posList, crsName))
            ]
        }
    }

    #addLineString(json: any, crsName: string) {
        const posLists = JSONPath({ path: '$..gml:posList', json })
        this.geometry = {
            type: 'LineString',
            coordinates: posLists
                .map((posList: any) => posList2PairsList(posList, crsName))
                .flatMap((x: any) => x)        }
    }

    #addPoint(json: any, crsName: string) {
        const posPoint = JSONPath({ path: '$..gml:pos', json })
        this.geometry = {
            type: 'Point',
            coordinates: posList2PairsList(posPoint, crsName)
                .flatMap((x: any) => x)
        }
    }

    toGeoJson() {
        return {
            type: this.type,
            properties: this.properties,
            geometry: this.geometry
        }
    }

}

class FeatureCollection {
    type = 'FeatureCollection'
    name: string
    config: FeatureConfig
    allowedGeometries: Geometries[]
    properties = {
        crsName: '',
        lowerCorner: [0, 0],
        upperCorner: [0, 0]
    }
    features: Feature[]

    constructor(name: string, config: FeatureConfig) {
        this.name = name
        this.config = config

        // Set allowed geometries
        const { excludeGeometries } = this.config
        this.allowedGeometries = Object.values(Geometries).filter(geometry => {
            return !excludeGeometries?.includes(geometry as Geometries)
        })

        this.features = []
    }

    setProperties(json: any) {
        const obj = JSONPath({ path: '$..gml:boundedBy.*', json }).pop()

        const crsName = parseCrsName(obj['@srsName'])
        const lowerCorner = parseNumberList(obj['gml:lowerCorner'])
        const upperCorner = parseNumberList(obj['gml:upperCorner'])

        Object.assign(this.properties, {
            crsName,
            lowerCorner: proj4(crsName, GEOJSON_CRS_NAME, lowerCorner),
            upperCorner: proj4(crsName, GEOJSON_CRS_NAME, upperCorner),
        })
    }

    addFeatures(json: any) {
        const gmlId = json['@gml:id']
        let feature = this.features.find(({ properties }) => properties.gml_id === gmlId)
        if (!feature) {
            feature = new Feature(gmlId)
            this.features.push(feature)
        }
        feature.setGeometry(
            json,
            this.allowedGeometries,
            this.properties.crsName
        )
    }

    toGeoJson() {
        return {
            type: this.type,
            name: this.name,
            crs: {
                type: "name",
                properties: {
                    name: GEOJSON_CRS_NAME,
                    converted_from: this.properties.crsName
                }
            },
            features: this.features.map(feature => feature.toGeoJson())

        }
    }
}

class Gml {
    featureCollections: FeatureCollection[]
    constructor() {
        this.featureCollections = []
    }

    async addFeatureCollectionsFromFile(filename: string) {
        console.log(`Parsing: ${filename}`)
        const xmlStr = await Bun.file(getFilepath(SOURCE_DIR, filename)).text()
        const json = (new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@"
        })).parse(xmlStr)

        this.#addFeatureCollections(json, filename)
    }

    #addFeatureCollections(json: any, filename: string) {
        const objList = JSONPath({ path: '$..gml:featureMember.*', json })
        objList.forEach((obj: any) => {
            const featureName = Object.keys(obj).pop() as string
            if (filterFileFeature(filename, featureName)) {
                const featureConfig = getFileFeatureConfig(filename, featureName) as FeatureConfig
                const remappedFeaturename = featureConfig.mapTo || featureName
                let featureCollection = this.featureCollections.find(({ name }) => name === remappedFeaturename)
                if (!featureCollection) {
                    //@ts-ignore
                    featureCollection = new FeatureCollection(remappedFeaturename, featureConfig)
                    this.featureCollections.push(featureCollection)
                    featureCollection.setProperties(json)
                }
                featureCollection.addFeatures(obj[featureName])
            }
        })
    }

    async writeGeoJson() {
        this.featureCollections.forEach(async collection => {
            const colName = collection.name.split(':').pop()?.toLocaleLowerCase()
            const destPath = getFilepath(DEST_DIR, `${DEST_FILE_PREFIX}_${colName}.geojson`)
            const geojson = collection.toGeoJson()
            await Bun.write(destPath, (JSON.stringify(geojson, null, 4)))
            console.log(`Wrote featureCollection ${collection.name} => ${destPath}`)
        })
    }

    /**
     *
     */
    async writeBoundsJson() {
        const maxBounds = this.featureCollections.reduce((acc, collection) => {
            // Very important to get this correct!
            const [minLat, minLng] = collection.properties.lowerCorner
            const [maxLat, maxLng] = collection.properties.upperCorner
            return {
                minLat: Math.min(acc.minLat, minLat),
                minLng: Math.min(acc.minLng, minLng),
                maxLat: Math.max(acc.maxLat, maxLat),
                maxLng: Math.max(acc.maxLng, maxLng),
            }
        }, {
            minLat: Number.MAX_SAFE_INTEGER,
            minLng: Number.MAX_SAFE_INTEGER,
            maxLat: 0,
            maxLng: 0,
        })

        const boundsFile =getFilepath(DEST_DIR, `${DEST_FILE_PREFIX}_bounds.json`)
        await Bun.write(boundsFile, JSON.stringify(maxBounds, null, 4))
        console.log(`Wrote maxbounds to ${boundsFile}`)
    }
}

const main = async () => {
    await $`mkdir -p ${DEST_DIR}`

    const filenames = (await readdir(SOURCE_DIR))
        .filter((filename: string) => filename.endsWith('.gml'))
        .filter((filename: string) => filterFileFeature(filename))

    const gml = new Gml()

    await Promise.all(filenames.map(async filename => await gml.addFeatureCollectionsFromFile(filename)))

    await gml.writeGeoJson()

    await gml.writeBoundsJson()
}

main()