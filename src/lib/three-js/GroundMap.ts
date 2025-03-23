import * as THREE from 'three'
import * as GeoTIFF from 'geotiff';
import { GeoProjector } from '../GeoProjector';

async function loadElevationData(url: string) {
  // Load TIFF file
  const tiff = await GeoTIFF.fromUrl(url);
  const image = await tiff.getImage();

  // Read elevation data
  const rasters = await image.readRasters({ samples: [0] });
  const width = image.getWidth();
  const height = image.getHeight();

  const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();
  const lonRange = (maxLon - minLon);
  const latRange = (maxLat - minLat);

  return {
    raster: rasters[0] as GeoTIFF.TypedArray, // Assuming a single-band DEM
    width,
    height,
    lonRange,
    latRange
  };
}

type Options = {
  dispMapUrl: string
  projector: GeoProjector
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
  options: Options

  planeWidth = 1000
  widthSegments = 100 // Increase to match diplacement better with texture

  canvas = document.createElement('canvas');

  planeGeometry!: THREE.PlaneGeometry
  dispMapTexture!: THREE.Texture
  material!: THREE.MeshStandardMaterial
  mesh!: THREE.Mesh

  mapColor = '#ffffff'
  displacementScale = 10

  constructor(scene: THREE.Scene, options: Options) {
    this.scene = scene
    this.options = options
  }

  async asyncInit() {
    const { toBounds, fromBounds } = this.options.projector
    const { planeWidth, widthSegments } = this
    const planeHeight = Math.round(planeWidth / toBounds.mapRatio)
    const heightSegments = Math.round(widthSegments / toBounds.mapRatio)
    // Create THREE.js PlaneGeometry with the converted dimensions
    const plane = new THREE.PlaneGeometry(planeWidth, planeHeight, widthSegments, heightSegments);
    // Calc plane segments lengths
    const planeSeg = {
      lenX: toBounds.xRange / widthSegments,
      lenY: toBounds.yRange / heightSegments
    }

    /**
     * DEM
     * */
    const DEM = await loadElevationData(this.options.dispMapUrl);
    // Calc DEM segments lengths
    const demSeg = {
      lenX: DEM.lonRange / widthSegments,
      lenY: DEM.latRange / heightSegments
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
        const rasterVal = Math.max(DEM.raster[rasterIdx], 1) / this.displacementScale

        /**
         * Each vertex has three components (x, y, z)
         * - Multiply the vertex index by 3 gives the start index of the vertex in the array.
         * - Add 2 to the current start index to get index of the z-component
         */
        const vertexIdx = ((gridY * gridSize.x + gridX) * 3)  + 2;
        plane.attributes.position.array[vertexIdx] = Math.max(rasterVal, 1)
      }
    }

    // Inform Three.js that the plane has been modified and recompute normals.
    plane.attributes.position.needsUpdate = true;
    plane.computeVertexNormals();

    // Create a material
    const material = new THREE.MeshStandardMaterial({ color: this.mapColor, wireframe: true });

    // Create mesh
    const terrain = new THREE.Mesh(plane, material);
    terrain.rotation.x = -Math.PI / 2; // Rotate to align with ground

    this.scene.add(terrain);
  }
}