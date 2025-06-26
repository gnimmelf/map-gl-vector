import { Component, onMount, Suspense, Show } from "solid-js";
import { createStore } from "solid-js/store";

import * as dat from "lil-gui";
import * as THREE from "three";

import { MapControls } from "../lib/three-js/MapControls";
import { CompassRose } from "../lib/three-js/CompassRose";
import { MapMarkers } from "../lib/three-js/MapMarkers";
import { flags } from "../lib/utils";
import { Version } from "./Version";
import { LayerContainer } from "../lib/three-js/LayerContainer";
import { GeoJsonLayer } from "../lib/three-js/GeoJsonLayer";
import { ElevationMap } from "../lib/ElevationMap";

import { GroundMap } from "../lib/three-js/GroundMap";

/**
 * Constants
 */
const gui = new dat.GUI({ closeFolders: true });

const VIEW = {
  viewFractionX: 1,
  viewFractionY: 1,
  fov: 75,
  near: 0.1,
  far: 1e12,
  cameraDistance: 1000,
  cameraPos: new THREE.Vector3(0, 750, 300),
  ambientLight: new THREE.AmbientLight(0xffffff, 2),
} as const;

const ASSETS_URL = "https://localhost:3030/assets/";

const MAP = {
  geoJsonBaseUrl: `${ASSETS_URL}/geojson/`,
  elevationMapUrl: new URL(`${ASSETS_URL}/output_final.tif`),
  width: 1000, // Map max-width-units within the THREEJS coordinatesystem
  widthSegments: 200,
  crsName: "EPSG:25832",
};

const geoLayers = [
  // new GeoJsonLayer(
  //   new URL(`${MAP.geoJsonBaseUrl}/hurdal_kommuneomrade.geojson`),
  //   {
  //     id: "area",
  //     color: 0x000000,
  //     useElevation: false,
  //   }
  // ),
  // new GeoJsonLayer(new URL(`${MAP.geoJsonBaseUrl}/hurdal_alpinbakke.geojson`), {
  //   id: "alpineslopes",
  //   color: 0xffffff,
  // }),
  // new GeoJsonLayer(new URL(`${MAP.geoJsonBaseUrl}/hurdal_hoydekurve.geojson`), {
  //   id: "heightlines",
  //   color: 0x00ff00,
  // }),
  // new GeoJsonLayer(new URL(`${MAP.geoJsonBaseUrl}/hurdal_vann.geojson`), {
  //   id: "water",
  //   color: 0x0000ff,
  // }),
  new GeoJsonLayer(
    new URL(`${MAP.geoJsonBaseUrl}/hurdal_kommunegrense.geojson`),
    {
      id: "border",
      color: 0xff0000,
      useElevation: false,
    }
  ),
];

/**
 * MapGl Solid Component
 */
export const MapGl: Component<{
  scenebgurl: string;
}> = (props) => {
  // Hide gui unless debug
  gui.show(flags.debug);

  let containerElRef!: HTMLDivElement;
  let scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: MapControls,
    compass: CompassRose,
    mapMarkers: MapMarkers;

  const [store, setStore] = createStore({
    mapTheta: 0,
  });

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(window.devicePixelRatio);

  async function createScene() {
    /**
     * Scene, camera, light
     */
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(VIEW.fov, 1, VIEW.near, VIEW.far);
    camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);
    controls = new MapControls(camera, renderer);
    scene.add(camera, VIEW.ambientLight);

    if (flags.debug) {
      const axesHelper = new THREE.AxesHelper(1e12);
      scene.add(axesHelper);

      const groundMap = new GroundMap(scene, {
        dispMapUrl: MAP.elevationMapUrl.href,
        crsName: MAP.crsName,
        mapWidth: MAP.width,
        widthSegments: MAP.widthSegments,
        mapColor: 0x004433,
      });
      groundMap.asyncInit();
    }

    /**
     * Compass rose
     */
    compass = new CompassRose(camera);
    await compass.asyncInit();

    /**
     *  Layers
     */
    const world = new LayerContainer({
      geoLayers: geoLayers,
      crsName: MAP.crsName,
      mapWidth: MAP.width,
      elevationMap: new ElevationMap(MAP.elevationMapUrl, {
        displacementScale: 15,
      }),
    });
    await world.asyncInit();
    world.addTo(scene);
  }

  /**
   * Eventhandlers
   */
  function onResize() {
    const rect = containerElRef.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    compass.onResize();
    // mapMarkers.onResize()
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  /**
   * Animationloop
   */
  function animationLoop() {
    // Scene
    controls.update();
    compass.animate();
    renderer.render(scene, camera);
    // Signals
    setStore({
      mapTheta: compass.bearing,
    });
  }

  onMount(async () => {
    await createScene();
    renderer.setAnimationLoop(animationLoop);
    addEventListener("resize", onResize, false);
    addEventListener(
      "dblclick",
      (evt: MouseEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
      },
      false
    );
    // setTimeout(() => onResize(), 1000);
  });

  return (
    <Suspense fallback="Loading...">
      <div
        ref={containerElRef}
        class="map-container"
        style="width: 100%; height: 100%;"
      >
        {renderer.domElement}
      </div>
      <Version />
      <Show when={flags.debug}>
        <div style={{ "text-align": "left" }}>
          <div>Map theta: {Math.round(store.mapTheta * 100) / 100}</div>
        </div>
      </Show>
    </Suspense>
  );
};

export default MapGl;
