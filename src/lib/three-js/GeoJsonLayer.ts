import * as THREE from 'three'
//@ts-expect-error
import earcut from 'earcut';

import { dir, flags, waitForProperty } from '../utils'
import { GeoProjector } from '../GeoProjector';
import { ElevationMap } from '../ElevationMap';

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
    projector?: GeoProjector
    elevationMap?: ElevationMap
    color?: THREE.ColorRepresentation
    extrusion?: null | number
}

/**
 * GeoJsonLayer
 */
export class GeoJsonLayer {
    url: URL
    group!: THREE.Group
    options: GeoJsonLayerOptions
    projector?: GeoProjector
    elevationMap?: ElevationMap

    constructor(url: URL, options: GeoJsonLayerOptions) {
        this.url = url
        this.options = Object.assign({
            extrusion: null,
            color: 0xff0000
        }, options || {})
    }

    async asyncInit() {
        if (this.options.projector) {
            console.log(`GeoJsonLayer ${this.options.id}: Using projector from options`)
            this.projector = this.options.projector
        }
        if (this.options.elevationMap) {
            console.log(`GeoJsonLayer ${this.options.id}: Using elevationMap from options`)
            this.elevationMap = this.options.elevationMap
        }

        const geoJson = await (await fetch(this.url)).json()
        this.group = this.#parse(geoJson)
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

        // Convert lat/lon to 3D position
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

    #latLngToVector3(latLng: [number, number], ) {
        const layerCoord = this.projector!.normalize(latLng)
        const elevation = this.elevationMap && flags.elevation
            ? this.elevationMap.getElevationAt(latLng, this.projector!.options.fromProjection)
            : 0;
        return new THREE.Vector3(layerCoord[0], layerCoord[1], elevation);
    }

}





