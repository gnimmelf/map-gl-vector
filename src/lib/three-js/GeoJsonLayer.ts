import * as THREE from 'three'
//@ts-expect-error
import earcut from 'earcut';

import { flags } from '../utils'
import { GeoProjector } from '../GeoProjector';
import { ElevationMap } from '../ElevationMap';
import { GeoBounds } from '../GeoBounds';

type GeoJSON = {
  type: string;
  features: Feature[];
};

type Feature = {
  type: string;
  geometry: Geometry;
  properties?: Record<string, any>;
};

type Geometry = {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: any;
};

type GeoJsonLayerOptions = {
  id: string
  trgtCrsName?: string
  elevationMap?: ElevationMap
  color?: THREE.ColorRepresentation
  extrusion?: null | number
  useElevation?: boolean
  mapWidth?: number
}

/**
 * GeoJsonLayer
 */
export class GeoJsonLayer {
  url: URL
  group!: THREE.Group
  options: GeoJsonLayerOptions
  data!: any
  srcBounds!: GeoBounds
  projector!: GeoProjector

  constructor(url: URL, options: GeoJsonLayerOptions) {
    this.url = url
    this.options = Object.assign({
      extrusion: null,
      color: 0xff0000,
      useElevation: true
    }, options || {})
  }

  async asyncInit(options: Partial<GeoJsonLayerOptions>) {

    Object.assign(this.options, options)
    console.assert(this.options.trgtCrsName, `No trgtCrsName set for ${this.options.id}`)

    const geoJson = await (await fetch(this.url)).json()

    // Set the bounds for this geojson
    const srcCrsName = geoJson.crs.properties.name
    this.srcBounds = new GeoBounds(srcCrsName, {
      x: { min: geoJson.bbox[0], max: geoJson.bbox[2] },
      y: { min: geoJson.bbox[1], max: geoJson.bbox[3] }
    })

    this.data = geoJson
    return this
  }

  async buildLayer(projector: GeoProjector) {
    this.projector = projector
    this.group = this.#parse(this.data)
    return this
  }

  async addTo(parent: THREE.Object3D | THREE.Group) {
    const group = this.group
    parent.add(group)
    return group
  }

  #parse(geoJson: GeoJSON) {
    console.assert(this.projector, `projector not set for ${this.options.id}`);

    const group = new THREE.Group()

    geoJson.features.forEach((feature: Feature) => {
      const geometryType = feature.geometry.type;
      const coordinates = feature.geometry.coordinates;
      switch (geometryType) {
        case 'Point':
          group.add(this.#toPoint(coordinates))
          break;
        case 'LineString':
          group.add(this.#toLineString(coordinates))
          break;
        case 'Polygon':
          group.add(this.#toPolygon(coordinates))
          break;
        default:
          console.warn('Geometry type not supported:', geometryType);
      }
    })
    return group
  }

  #toPoint(coordinates: [number, number]) {
    const vector3 = this.#latLngToVector3(coordinates);
    const pointGeometry = new THREE.BufferGeometry();
    const pointMaterial = new THREE.PointsMaterial({ color: this.options.color, size: 10 });

    // Convert lat/lng to 3D position
    const pointPosition = new THREE.Vector3(vector3.x, vector3.y, vector3.z);
    pointGeometry.setFromPoints([pointPosition]);

    const pointMesh = new THREE.Points(pointGeometry, pointMaterial);

    return pointMesh
  }

  #toLineString(coordinates: [number, number][]) {
    const points = coordinates.map((coord: [number, number]) => {
      return this.#latLngToVector3(coord);
    });

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: this.options.color });

    const line = new THREE.Line(lineGeometry, lineMaterial);

    return line
  }

  #toPolygon(coordinates: [number, number][][]) {
    const vertices: number[] = [];
    const holeIndices: number[] = [];
    let vertexCount = 0;

    // Process the outer boundary (first ring)
    coordinates[0].forEach(coord => {
      const vector3 = this.#latLngToVector3(coord);
      vertices.push(vector3.x, vector3.y, vector3.z);
      vertexCount++;
    });

    // Process holes (subsequent rings)
    for (let i = 1; i < coordinates.length; i++) {
      const hole = coordinates[i];
      holeIndices.push(vertexCount); // Mark the start index of the hole

      hole.forEach(coord => {
        const vector3 = this.#latLngToVector3(coord);
        vertices.push(vector3.x, vector3.y, vector3.z);
        vertexCount++;
      });
    }

    // Triangulate the polygon with holes using earcut
    const triangles = earcut(vertices, holeIndices, 3);

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(triangles);

    const material = new THREE.MeshBasicMaterial({ color: this.options.color, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
  }

  #latLngToVector3(fromCoordinate: [number, number],) {
    const toCoordinate = this.projector!.forwardToLocal(fromCoordinate) as [number, number]

    let elevation = 0

    if (this.options.useElevation && this.options.elevationMap && flags.elevation) {
      elevation = this.options.elevationMap.getElevationAt(fromCoordinate, {
        width: this.projector.mapWidth,
        height: this.projector.mapHeight,
      })
    }

    return new THREE.Vector3(toCoordinate[0], toCoordinate[1], elevation);
  }

}





