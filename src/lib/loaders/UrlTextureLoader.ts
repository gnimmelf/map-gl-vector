import * as THREE from 'three'

const textureLoader = new THREE.TextureLoader()

export class UrlTextureLoader {
  assets: Record<string, Promise<THREE.Texture>> = {}

  constructor(assets: Record<string, URL>) {
    for (const key in assets) {
      this.assets[key] = this.#load(assets[key])
    }
  }

  get(key: string) {
    return this.assets[key]
  }

  async #load(url: URL): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      textureLoader.load(url.toString(), (texture) => {
        resolve(texture)
      })
    })
  }
}