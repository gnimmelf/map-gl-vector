import { Component, onMount, Show, Suspense } from "solid-js";
import { createStore } from "solid-js/store";

import { Deck, MapViewState, PickingInfo } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';

import { load } from "@loaders.gl/core";

import { TerrainLayer, Bounds } from "../lib/my-geotiff/TerrainLayer";
import { GeoTIFFLoader } from "../lib/loaders/GeoTiffLoader";

import { flags, dir } from "../lib/utils";
import { Version } from "./Version";


type PropertiesType = {
  name: string;
  color: string;
};

const bounds = {
  minLat: 10.66698710844047,
  minLng: 60.33636918184986,
  maxLat: 11.147280359235149,
  maxLng: 60.51791684203125
};

// Calculate the center
const centerLat = (bounds.minLat + bounds.maxLat) / 2;
const centerLng = (bounds.minLng + bounds.maxLng) / 2;

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: centerLat,
  latitude: centerLng,
  zoom: 10,
  pitch: 55,
  maxZoom: 13.5,
  bearing: 0,
  maxPitch: 89
};

const terrainUrl = 'https://localhost:3030/assets/output_final.tif'

const getLayers = async (...ids: string[]) => {

  /**
   * Terrainlayer: https://deck.gl/docs/api-reference/geo-layers/terrain-layer
   *
   * See: https://github.com/visgl/deck.gl/discussions/7816
   * - Not possible atm to have deck TerainLayer based on a single file of terrain
   * - The `TerrainExtension` is experimental, and requires a map-template-url with {x}{y}
   *   to elevate the other layers
   */

  // const tiff = await parse(fetch(terrainUrl), GeoTIFFLoader);
  const tiff = await load(terrainUrl, GeoTIFFLoader, {
    tiff: {
      band: 0
    }
  });

  return [
    new TerrainLayer({
      id: 'terrain',
      elevationData: {
        data: tiff.data as (Int8Array<ArrayBufferLike>),
        width: tiff.width,  // Width of the raster
        height: tiff.height, // Height of the raster
      },
      bounds: tiff.bounds as Bounds,
      elevationDecoder: {
        "rScaler": 1,
        "gScaler": 0,
        "bScaler": 0,
        "offset": 20
      },
      minZoom: 0,
      strategy: 'no-overlap',
      wireframe: true,
      material: { ambient: 0.5, diffuse: 0.6 },
      color: [255, 255, 255],
      operation: 'terrain'
    }),

    new GeoJsonLayer<PropertiesType>({
      id: 'farmland',
      data: 'https://localhost:3030/assets/geojson/hurdal_dyrketmark.geojson',
      stroked: true,
      filled: true,
      pointType: 'circle+text',
      pickable: true,

      getFillColor: [0, 200, 0],
      getLineColor: [200, 200, 200],
      getTextColor: [200, 200, 200],
      getText: (f: any) => f.properties.name,
      getLineWidth: 2,
      getPointRadius: 4,
      getTextSize: 12
    }),

    new GeoJsonLayer<PropertiesType>({
      id: 'alpine',
      data: 'https://localhost:3030/assets/geojson/hurdal_alpinbakke.geojson',
      stroked: true,
      filled: true,
      pointType: 'circle+text',
      pickable: true,

      getFillColor: [200, 200, 200],
      getLineColor: [200, 200, 200],
      getTextColor: [200, 200, 200],
      getText: (f: any) => f.properties.name,
      getLineWidth: 2,
      getPointRadius: 4,
      getTextSize: 12
    }),

    new GeoJsonLayer<PropertiesType>({
      id: 'water',
      data: 'https://localhost:3030/assets/geojson/hurdal_vann.geojson',
      stroked: true,
      filled: true,
      pointType: 'circle+text',
      pickable: true,

      getFillColor: [0, 0, 200],
      getLineColor: [0, 0, 200],
      getTextColor: [200, 200, 200],
      getText: (f: any) => f.properties.name,
      getLineWidth: 20,
      getPointRadius: 4,
      getTextSize: 12
    }),

    new GeoJsonLayer<PropertiesType>({
      id: 'muncipality',
      data: 'https://localhost:3030/assets/geojson/hurdal_kommunegrense.geojson',
      stroked: true,
      filled: true,
      pointType: 'circle+text',
      pickable: true,

      getFillColor: [200, 0, 0],
      getLineColor: [200, 0, 200],
      getTextColor: [200, 200, 200],
      getText: (f: any) => f.properties.name,
      getLineWidth: 20,
      getPointRadius: 4,
      getTextSize: 12
    }),

    new GeoJsonLayer<PropertiesType>({
      id: 'height-curves',
      data: 'https://localhost:3030/assets/geojson/hurdal_hoydekurve.geojson',
      stroked: true,
      filled: true,
      pointType: 'circle+text',
      pickable: true,

      getFillColor: [200, 0, 0],
      getLineColor: [200, 0, 200],
      getTextColor: [200, 200, 200],
      getText: (f: any) => f.properties.name,
      getLineWidth: 6,
      getPointRadius: 4,
      getTextSize: 12,
      extensions: [new TerrainExtension()],
    })
  ].filter(layer => !ids.length || ids.includes(layer.id))
}

/**
 * DeckGl Solid Component
 */
export const DeckGl: Component = () => {
  let canvasRef!: HTMLCanvasElement;
  const [store, setStore] = createStore({
    mapTheta: 0,
    mousePos: { x: 0, y: 0 },
  });

  const createDeck = async () => {

    const layers = await getLayers(
      // 'height-curves',
      // 'water',
      // 'farmland',
      // 'alpine',
      'muncipality',
    )

    const deck = new Deck({
      canvas: canvasRef,
      style: { position: 'relative' },
      initialViewState: INITIAL_VIEW_STATE,
      controller: true,
      getTooltip: ({ object }) => object && object.properties.name,
      layers: Object.values(layers)
    });
  };

  /**
   * Eventhandlers
   */
  function onResize() {
    const rect = canvasRef.getBoundingClientRect();
  }

  function onMousemove(evt: MouseEvent) {
    // TODO! Expensive on every mousemove
    const rect = canvasRef.getBoundingClientRect();
    // Normalize mouse position to [-1, 1]
    const mouseX = ((evt.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1;
    const mouseY = -((evt.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
    setStore({
      mousePos: {
        x: mouseX,
        y: mouseY,
      },
    });
  }

  onMount(async () => {
    createDeck();
  });

  return (
    <Suspense fallback="Loading...">
      <canvas ref={canvasRef}></canvas>
      <Version />
      <Show when={flags.debug}>
        <div style={{ "text-align": "left" }}>
          <div>
            Map theta: {Math.round(store.mapTheta * 100) / 100}
            <br />
            Mouse.x: {Math.round(store.mousePos.x * 100) / 100}
            <br />
            Mouse.y: {Math.round(store.mousePos.y * 100) / 100}
          </div>
        </div>
      </Show>
    </Suspense>
  );
};

export default DeckGl