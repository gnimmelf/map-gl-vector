import proj4 from 'proj4'

export const SOURCE_DIR = 'hurdal/gml/'
export const DEST_DIR = 'assets/geojson/'
export const DEST_FILE_PREFIX = 'hurdal'

export enum Geometries {
    Point = 'Point',
    LineString = 'LineString',
    Polygon = 'Polygon',
}

export type FeatureConfig = {
    name?: string
    // `true` to include point-position features
    excludeGeometries?: Geometries[]
    // Remapping to another name
    mapTo?: string
}

type FileFeatureConfig = {
    // Comment out filnames to exclude while debugging
    filename?: string,
    features: FeatureConfig[]
}

// Add projection definitions for all the `crsNames` encountered in the conversion
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");
export const FILE_FEATURES: FileFeatureConfig[] = [
    {
        filename: 'Basisdata_3242_Hurdal_25832_N50Hoyde_GML.gml',
        features: [
            { name: 'app:Høydekurve', mapTo: 'app:Hoydekurve' }
        ]
    },
    {
        filename: 'Basisdata_3242_Hurdal_25832_N50BygningerOgAnlegg_GML.gml',
        features: [
            { name: 'app:Bygning', excludeGeometries: [Geometries.Point] }
        ]
    },
    {
        filename: 'Basisdata_3242_Hurdal_25832_N50Arealdekke_GML.gml',
        features: [
            { name: 'app:Alpinbakke' },
            { name: 'app:ÅpentOmråde', mapTo: 'ApentOmrade'},
            { name: 'app:Myr' },
            { name: 'app:Rullebane' },
            { name: 'app:Skog' },
            { name: 'app:Tettbebyggelse' },
            { name: 'app:DyrketMark' },
            { name: 'app:Gravplass' },
            { name: 'app:Industriområde', mapTo: 'app:Industriomrade' },
            { name: 'app:SportIdrettPlass' },
            { name: 'app:Elv', mapTo: 'app:Vann' },
            { name: 'app:ElvKant', mapTo: 'app:Vann' },
            { name: 'app:ElvBekk', mapTo: 'app:Vann' },
            { name: 'app:Innsjø', mapTo: 'app:Vann' },
            { name: 'app:InnsjøRegulert', mapTo: 'app:Vann' },
            { name: 'app:Høyde', mapTo: 'app:Hoyde'}
        ],
    },
    {
        filename: 'Basisdata_3242_Hurdal_25832_N50AdministrativeOmrader_GML.gml',
        features: [
            { name: 'app:Fylkesgrense', mapTo: 'app:Kommunegrense'},
            { name: 'app:Kommunegrense' },
            { name: 'app:Kommune', mapTo: 'app:Kommuneomrade'},
        ]
    },
    {
        // filename: 'Basisdata_3242_Hurdal_25832_N50Stedsnavn_GML.gml',
        features: [
            { name: 'app:StedsnavnTekst', excludeGeometries: [Geometries.Point] }
        ]
    }
]

