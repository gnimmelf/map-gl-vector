import * as THREE from 'three'
import { loadElevationData } from '../geo-utils'
import { GeoBounds } from '../GeoBounds'

type Options = {
  dispMapUrl: string
  trgtCrsName: string
  mapWidth?: number
  widthSegments?: number
  mapColor?: THREE.ColorRepresentation
  displacementScale?: number
}

/**
 * Ground Map Plane
 *
 * DO NOT DELETE THIS!
 *
 * This is an educational component where all steps are very elaborate on purpouse.
 */
export class GroundMap {
  scene: THREE.Scene
  options: Required<Options>

  mapWidth = 1000
  widthSegments = 100 // Increase to match diplacement better with texture

  canvas = document.createElement('canvas');

  planeGeometry!: THREE.PlaneGeometry
  dispMapTexture!: THREE.Texture
  material!: THREE.MeshStandardMaterial
  mesh!: THREE.Mesh

  constructor(scene: THREE.Scene, options: Options) {
    this.scene = scene
    this.options = this.options = Object.assign({
      mapColor: 0xff0000,
      displacementScale: 10,
      mapWidth: 1000,
      widthSegments: 100
    }, options || {})
  }

  async asyncInit() {
    const DEM = await loadElevationData(this.options.dispMapUrl);
    const trgtBounds = GeoBounds.fromBounds(DEM.bounds, {
      trgtCrsName: this.options.trgtCrsName,
    })
    const { mapWidth, widthSegments } = this.options
    const mapHeight = Math.floor(mapWidth / trgtBounds.ratio)
    const heightSegments = Math.floor(widthSegments / trgtBounds.ratio)
    // Create THREE.js PlaneGeometry with the converted dimensions
    const plane = new THREE.PlaneGeometry(mapWidth, mapHeight, widthSegments, heightSegments);
    // Calc plane segments lengths
    const planeSeg = {
      lenX: trgtBounds.xRange / widthSegments,
      lenY: trgtBounds.yRange / heightSegments
    }

    /**
     * DEM
     * */

    // Calc DEM segments lengths
    const demSeg = {
      lenX: DEM.bounds.xRange / widthSegments,
      lenY: DEM.bounds.yRange / heightSegments
    }

    /**
     * Vertex mapping
     */
    const gridSize = {
      x: widthSegments + 1,
      y: heightSegments + 1
    };
    // Loop over each vertex using a 2D grid index
    for (let gridY = 0; gridY < gridSize.y; gridY++) {
      for (let gridX = 0; gridX < gridSize.x; gridX++) {
        /**
         * Get DEM.raster coords from
         */
        const rasterX = Math.floor(gridX * (DEM.width - 1) / widthSegments);
        const rasterY = Math.floor(gridY * (DEM.height - 1) / heightSegments);

        /**
         * Compute the index in the 1D elevation array.
         * Heigh * width + the current x index
         */
        const rasterIdx = (rasterY * DEM.width) + rasterX;

        /**
         * Modulate the rasterVal (Meters above sealevel)
         */
        const rasterVal = Math.max(DEM.raster[rasterIdx], 1) / this.options.displacementScale

        /**
         * Each vertex has three components (x, y, z)
         * - Multiply the vertex index by 3 gives the start index of the vertex in the array.
         * - Add 2 to the current start index to get index of the z-component
         */
        const vertexIdx = ((gridY * gridSize.x + gridX) * 3) + 2;
        plane.attributes.position.array[vertexIdx] = - rasterVal
      }
    }

    // Inform Three.js that the plane has been modified and recompute normals.
    plane.attributes.position.needsUpdate = true;
    plane.computeVertexNormals();

    // Create a material
    const material = new THREE.MeshStandardMaterial({ color: this.options.mapColor, wireframe: true });

    // Create mesh
    const terrain = new THREE.Mesh(plane, material);
    terrain.rotation.x = -Math.PI / 2; // Rotate to align with ground

    this.scene.add(terrain);
  }
}