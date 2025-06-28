import * as THREE from "three";

import { GeoJsonLayer } from "./GeoJsonLayer";
import { ElevationMap } from "../ElevationMap";
import { flags } from "../utils";
import { GeoProjector } from "../GeoProjector";
import { GeoBounds } from "../GeoBounds";

type LayerContainerOptions = {
  geoLayers: GeoJsonLayer[];
  trgtCrsName: string
  mapWidth: number
  elevationMap?: ElevationMap
};

export class LayerContainer {
  options: LayerContainerOptions;
  group!: THREE.Group;

  constructor(options: LayerContainerOptions) {
    this.options = options
  }

  async asyncInit() {
    if (this.options.elevationMap) {
      await this.options.elevationMap.asyncInit()
    }

    if (flags.debug) {
      //@ts-expect-error
      window.elevationMap = this.options.elevationMap
    }

    const containerGroup = new THREE.Group();
    const layers = this.options.geoLayers;

    // Load geoLayers
    await Promise.all(layers.map((layer) => {
      return layer.asyncInit({
        trgtCrsName: this.options.trgtCrsName,
        elevationMap: this.options.elevationMap,
        mapWidth: this.options.mapWidth
      })
    }));

    // TODO! Unify Bounds - Compute combined bounding box
    const unifiedTrgtBounds = new GeoBounds(
      this.options.trgtCrsName,
      layers.reduce((bounds: any, layer: GeoJsonLayer) => {
        // We need to do this using the common CRS target
        const layerBounds = GeoBounds.fromBounds(layer.srcBounds, {
          trgtCrsName: this.options.trgtCrsName,
        })

        console.log({ layerBounds })
        return {
          x: {
            min: Math.min(bounds.x.min, layerBounds.x.min),
            max: Math.max(bounds.x.max, layerBounds.x.max)
          },
          y: {
            min: Math.min(bounds.y.min, layerBounds.y.min),
            max: Math.max(bounds.y.max, layerBounds.y.max)
          }
        }
      }, {
        x: { min: Number.MAX_SAFE_INTEGER, max: 0 },
        y: { min: Number.MAX_SAFE_INTEGER, max: 0 }
      }))

    console.log({ unifiedTrgtBounds })

    layers.forEach((layer) => {
      const projector = new GeoProjector(layer.srcBounds, {
        trgtCrsName: this.options.trgtCrsName,
        trgtBounds: unifiedTrgtBounds,
        mapWidth: this.options.mapWidth,
      })
      layer.buildLayer(projector)
    })



    layers.forEach((layer, idx) => {
      const layerGroup = layer.group;
      // Fix up renderorder for no flicker
      layerGroup.renderOrder = idx
      layerGroup.children.forEach((obj: any) => obj.material.depthWrite = false);
      layerGroup.children.forEach((obj: any) => obj.material.depthTest = true);
      // Add layer to containerGroup
      layer.addTo(containerGroup)
    });

    // Postition container group
    containerGroup.rotation.x = -Math.PI / 2;

    this.group = containerGroup
    return this
  }

  async addTo(parent: THREE.Scene | THREE.Group, renderOrder = 0) {
    const group = this.group;
    group.renderOrder = renderOrder;
    parent.add(group);
    // Adjust group in scene
    group.updateWorldMatrix(true, true);
    const boundingBox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    group.position.set(-center.x, 0, -center.z);
    return this;
  }
}
