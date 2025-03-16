// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {
    Color,
    CompositeLayer,
    CompositeLayerProps,
    DefaultProps,
    Layer,
    LayersList,
    log,
    Material,
    TextureSource,
    UpdateParameters
} from '@deck.gl/core';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import type { MeshAttributes } from '@loaders.gl/schema';
import { TerrainWorkerLoader } from '@loaders.gl/terrain';

import { GeoTIFFData } from '../loaders/GeoTiffLoader'

type urlType = string
type URLTemplate = string | string[] | null;
export type Bounds = [minX: number, minY: number, maxX: number, maxY: number];

const DUMMY_DATA = [1];

const defaultProps: DefaultProps<TerrainLayerProps> = {
    // Image url that encodes height data
    elevationData: {
        data: [],

    },
    // Image url to use as texture
    texture: {
        type: 'object' as const,
        value: null as URLTemplate,
        optional: true
    },
    // Martini error tolerance in meters, smaller number -> more detailed mesh
    meshMaxError: { type: 'number', value: 4.0 },
    // Bounding box of the terrain image, [minX, minY, maxX, maxY] in world coordinates
    bounds: { type: 'array', value: null, optional: true, compare: true },
    // Color to use if texture is unavailable
    color: { type: 'color', value: [255, 255, 255] },
    // Object to decode height data, from (r, g, b) to height in meters
    elevationDecoder: {
        type: 'object',
        value: {
            rScaler: 1,
            gScaler: 0,
            bScaler: 0,
            offset: 0
        }
    },
    // Supply url to local terrain worker bundle. Only required if running offline and cannot access CDN.
    workerUrl: '',
    // Same as SimpleMeshLayer wireframe
    wireframe: false,
    material: true,

    loaders: [TerrainWorkerLoader]
};

type ElevationDecoder = { rScaler: number; gScaler: number; bScaler: number; offset: number };
type TerrainLoadProps = {
    bounds: Bounds;
    elevationData: string | null;
    elevationDecoder: ElevationDecoder;
    meshMaxError: number;
    signal?: AbortSignal;
};

type MeshAndTexture = [MeshAttributes | null, TextureSource | null];

/** All properties supported by TerrainLayer */
export type TerrainLayerProps = _TerrainLayerProps &
    SimpleMeshLayer &
    CompositeLayerProps;

/** Props added by the TerrainLayer */
type _TerrainLayerProps = {
    /** Image url that encodes height data. **/
    elevationData: GeoTIFFData;

    /** Image url to use as texture. **/
    texture?: URLTemplate;

    /** Martini error tolerance in meters, smaller number -> more detailed mesh. **/
    meshMaxError?: number;

    /** Bounding box of the terrain image, [minX, minY, maxX, maxY] in world coordinates. **/
    bounds?: Bounds | null;

    /** Color to use if texture is unavailable. **/
    color?: Color;

    /** Object to decode height data, from (r, g, b) to height in meters. **/
    elevationDecoder?: ElevationDecoder;

    /** Whether to render the mesh in wireframe mode. **/
    wireframe?: boolean;

    /** Material props for lighting effect. **/
    material?: Material;

    /**
     * @deprecated Use `loadOptions.terrain.workerUrl` instead
     */
    workerUrl?: string;
};

/** Render mesh surfaces from height map images. */
export class TerrainLayer<ExtraPropsT extends {} = {}> extends CompositeLayer<
    ExtraPropsT & Required<_TerrainLayerProps & Required<SimpleMeshLayer>>
> {
    static defaultProps = defaultProps;
    static layerName = 'TerrainLayer';

    state: {
        isTiled?: boolean;
        terrain?: MeshAttributes;
    };

    constructor(...args: any[]) {
        super(...args)

        console.log(args)

        this.state = {}
    }

    updateState({ props, oldProps }: UpdateParameters<this>): void {
        const elevationDataChanged = props.elevationData !== oldProps.elevationData;
        if (elevationDataChanged) {
            const { elevationData } = props;
            const isTiled =
                elevationData &&
                (Array.isArray(elevationData) ||
                    (elevationData.includes('{x}') && elevationData.includes('{y}')));
            this.setState({ isTiled });
        }

        // Reloading for single terrain mesh
        const shouldReload =
            elevationDataChanged ||
            props.meshMaxError !== oldProps.meshMaxError ||
            props.elevationDecoder !== oldProps.elevationDecoder ||
            props.bounds !== oldProps.bounds;

        if (!this.state.isTiled && shouldReload) {
            // When state.isTiled, elevationData cannot be an array
            const terrain = this.loadTerrain(props as TerrainLoadProps);
            this.setState({ terrain });
        }
    }

    loadTerrain({
        elevationData,
        bounds,
        elevationDecoder,
        meshMaxError,
        signal
    }: TerrainLoadProps): Promise<MeshAttributes> | null {
        if (!elevationData) {
            return null;
        }
        let loadOptions = this.getLoadOptions();
        loadOptions = {
            ...loadOptions,
            terrain: {
                skirtHeight: this.state.isTiled ? meshMaxError * 2 : 0,
                ...loadOptions?.terrain,
                bounds,
                meshMaxError,
                elevationDecoder
            }
        };
        const { fetch } = this.props;
        return fetch(elevationData, { propName: 'elevationData', layer: this, loadOptions, signal });
    }

    renderSubLayers(
        props: {
            id: string;
            data: MeshAndTexture;
        }
    ) {
        const SubLayerClass = this.getSubLayerClass('mesh', SimpleMeshLayer);

        const { color, wireframe, material } = this.props;
        const { data } = props;

        if (!data) {
            return null;
        }

        const [mesh, texture] = data;

        return new SubLayerClass(props, {
            data: DUMMY_DATA,
            mesh,
            texture,
            _instanced: false,
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
            getPosition: () => [0, 0, 0],
            getColor: color,
            wireframe,
            material
        });
    }

    // Update zRange of viewport
    onViewportLoad(...args: any[]): void {
        console.log('onViewportLoad', ...args)
    }

    renderLayers(): Layer | null | LayersList {
        const {
            color,
            material,
            elevationData,
            texture,
            wireframe,
        } = this.props;

        if (!elevationData) {
            return null;
        }

        const SubLayerClass = this.getSubLayerClass('mesh', SimpleMeshLayer);
        return new SubLayerClass(
            this.getSubLayerProps({
                id: 'mesh'
            }),
            {
                data: DUMMY_DATA,
                mesh: this.state.terrain,
                texture,
                _instanced: false,
                getPosition: () => [0, 0, 0],
                getColor: color,
                material,
                wireframe
            }
        );
    }
}
