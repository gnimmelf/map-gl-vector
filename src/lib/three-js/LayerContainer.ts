import * as THREE from "three";

import { GeoJsonLayer } from "./GeoJsonLayer";
import { ElevationMap } from "./ElevationMap";
import { GeoProjector } from "../GeoProjector";

type LayerContainerOptions = {
    geoLayers: GeoJsonLayer[];
    projector?: GeoProjector
    elevationMap?: ElevationMap
};

export class LayerContainer {
    options: LayerContainerOptions;
    group!: THREE.Group;

    constructor(options: LayerContainerOptions) {
        this.options = Object.assign(
            {
                // Default options
            },
            options
        );
    }

    async asyncInit() {
        if (this.options.elevationMap) {
            await this.options.elevationMap.asyncInit()
        }

        const containerGroup = new THREE.Group();
        const layers = this.options.geoLayers;
        // Load geoLayers
        await Promise.all(layers.map((layer) => {
            layer.projector = this.options.projector
            layer.elevationMap = this.options.elevationMap
            console.log(layer.options.id, layer.projector)
            return layer.asyncInit()
        }));
        layers.forEach(async (layer, idx) => {
            const layerGroup = layer.group;
            // Fix up renderorder for no flicker
            layerGroup.renderOrder = idx
            layerGroup.children.forEach((obj: any) => obj.material.depthWrite = false);
            layerGroup.children.forEach((obj: any) => obj.material.depthTest = true);
            // Add layer to containerGroup
            layer.addTo(containerGroup)
        });

        // Postition conatiner group
        containerGroup.rotation.x = Math.PI / 2;
        containerGroup.rotation.z = -Math.PI / 2;

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
        group.position.set(-center.x, -center.y, -center.z);
        return this;
    }
}
