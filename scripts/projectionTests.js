import proj4 from 'proj4'


const BOUNDS_FILE = '../assets/geojson/hurdal_bounds.json'

proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

const dir = (obj, depth = 0) => console.dir(obj, { depth });

const MAP = {
    terrainUrl: 'https://localhost:3030/assets/output_final.tif',
    mapWidth: 1000, // Map max-width-units within the THREEJS coordinatesystem
    widthSegments: 100, // Increase to match diplacement better with texture
    projections: {
        fromProjection: 'EPSG:4326',
        toProjection: 'EPSG:25832',
    }
}

const from = MAP[`From (${MAP.projections.fromProjection})`] = {}
const to = MAP[`To (${MAP.projections.toProjection})`] = {}

/**
 * TO Projection
 */
from.bounds = await Bun.file(BOUNDS_FILE).json()
from.range = {
    lat: from.bounds.maxLat - from.bounds.minLat,
    lng: from.bounds.maxLng - from.bounds.minLng,
}
from.mapHeight = (MAP.mapWidth * from.range.lat) / from.range.lng

/**
 * TO Projection
 */
const [maxLat, maxLng] = proj4(
    MAP.projections.fromProjection,
    MAP.projections.toProjection,
    [from.bounds.maxLat, from.bounds.maxLng])

const [minLat, minLng] = proj4(
    MAP.projections.fromProjection,
    MAP.projections.toProjection,
    [from.bounds.minLat, from.bounds.minLng])

to.bounds = {
    maxLat,
    maxLng,
    minLat,
    minLng,
}
to.range = {
    lat: to.bounds.maxLat - to.bounds.minLat,
    lng: to.bounds.maxLng - to.bounds.minLng,
}
to.mapHeight = (MAP.mapWidth * to.range.lat) / to.range.lng

/**
 * Nomalize
 */

const normalizeLat = (lat, { bounds, range, mapHeight}) => {
    const norm = ((lat - bounds.minLat) / range.lat) * mapHeight
    return [lat, norm]
}

function normalizeLng(lng, { bounds, range}) {
    const norm = ((lng - bounds.minLng) / range.lng) * MAP.mapWidth
    return [lng, norm]
}

from.normazlied = {
    maxLat: normalizeLat(from.bounds.maxLat, from),
    minLat: normalizeLat(from.bounds.minLat, from),
    maxLng: normalizeLng(from.bounds.maxLng, from),
    minLng: normalizeLng(from.bounds.minLng, from),
}

to.normazlied = {
    maxLat: normalizeLat(to.bounds.maxLat, to),
    minLat: normalizeLat(to.bounds.minLat, to),
    maxLng: normalizeLng(to.bounds.maxLng, to),
    minLng: normalizeLng(to.bounds.minLng, to),
}

dir(MAP, null)