import { initGdalJs } from 'gdal3.js';
import Martini from '@mapbox/martini';


    const gdal = await initGdalJs({ path: 'node_modules/gdal3.js/dist/package' });
    const dataset = (await gdal.open('square.tif')).datasets[0];
    const rasterBand = dataset.getRasterBand(1);
    const width = rasterBand.size.x;
    const height = rasterBand.size.y;
    const elevationData = new Float32Array(width * height);
    await rasterBand.pixels.read(0, 0, width, height, elevationData);

    const gridSize = 257;
    const martini = new Martini(gridSize);
    const tile = martini.createTile(elevationData);
    const mesh = tile.getMesh(10);

    const meshJson = {
        vertices: Array.from(mesh.vertices),
        triangles: Array.from(mesh.triangles)
    };

    await Bun.write(martiniFile, JSON.stringify(meshJson, null, 4))
