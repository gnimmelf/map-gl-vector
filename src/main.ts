import { customElement } from 'solid-element';
import MyMapGl from './components/MapGlHurdal';

declare global {
    const __APP_VERSION__: string;
}

customElement("my-map-gl", MyMapGl);


