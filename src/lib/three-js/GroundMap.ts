import * as THREE from 'three'
import * as dat from 'lil-gui'
import { flags, Sampler } from '../utils'
import * as GeoTIFF from 'geotiff';

const sampler = new Sampler('ElevationMap')

async function loadElevationData(url: string) {
  // Load TIFF file
  const tiff = await GeoTIFF.fromUrl(url);
  const image = await tiff.getImage();

  // Read elevation data
  const rasters = await image.readRasters({ samples: [0] });
  const width = image.getWidth();
  const height = image.getHeight();

  return { rasters, width, height };
}

type Options = {
  dispMapUrl: string
}

export const guiProps = {
  mapColor: '#ffffff',
  wireframe: flags.debug,
  displacementScale: 10,
}

/**
 * Ground Map Plane
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

  constructor(scene: THREE.Scene, options: Options) {
    this.scene = scene
    this.options = options
  }

  async asyncInit() {
    const { rasters, width, height } = await loadElevationData(this.options.dispMapUrl);
    console.log({ rasters, width, height });

    // Define your plane size in world units based on the DEM aspect ratio.
    const planeWidth = this.planeWidth;
    const planeHeight = Math.round(planeWidth * height / width);

    // Use a fixed number of width segments and compute height segments to match the DEM ratio.
    const widthSegments = this.widthSegments;
    const heightSegments = Math.round((height / width) * widthSegments);

    // Create a PlaneGeometry. This gives you (widthSegments+1) by (heightSegments+1) vertices.
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, widthSegments, heightSegments);
    const vertices = geometry.attributes.position.array;

    // Determine the number of vertices in each direction.
    const gridX = widthSegments + 1;
    const gridY = heightSegments + 1;

    // Loop over each vertex using a 2D grid index (i, j).
    for (let j = 0; j < gridY; j++) {
      for (let i = 0; i < gridX; i++) {
        // Calculate the index for the vertex in the flat vertices array.
        const vertexIndex = j * gridX + i;

        // Map the geometry vertex (i, j) to the corresponding DEM pixel coordinate.
        // Multiply the vertex grid index by the ratio of the DEM resolution (width/height) to the geometry segments.
        const pixelX = Math.floor(i * (width - 1) / widthSegments);
        const pixelY = Math.floor(j * (height - 1) / heightSegments);

        // Compute the index in the 1D elevation array.
        const rasterIdx = (pixelY * width) + pixelX;

        // Update the vertex's Z value using the elevation data.
        // Adjust the division (displacementScale) as needed for your scene.
        vertices[vertexIndex * 3 + 2] = Math.round(Math.max(rasters[0][rasterIdx], 1) / guiProps.displacementScale);
      }
    }

    // Inform Three.js that the geometry has been modified and recompute normals.
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Create a material
    const material = new THREE.MeshStandardMaterial({ color: guiProps.mapColor, wireframe: guiProps.wireframe });

    // Create mesh
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2; // Rotate to align with ground

    this.scene.add(terrain);
  }
}