import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

interface ModelLoaderOptions {
  dracoDecoderPath?: string;
}

/** GLTF加载器 */
export class ModelLoader {
  private loader: GLTFLoader = new GLTFLoader();
  public constructor(options: ModelLoaderOptions) {
    this.initModelLoader(options);
  }

  public async load(modelPath: string, callback?: (number: number) => void): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf: GLTF): void => {
          resolve(gltf);
        },
        (xhr: { loaded: number; total: number }): void => {
          const progress = Number(((xhr.loaded / xhr.total) * 100).toString().match(/^\d+(?:\.\d{0,2})?/));
          callback && callback(progress);
        },
        (error: unknown): void => {
          reject(error);
        },
      );
    });
  }

  private initModelLoader(options: ModelLoaderOptions): void {
    this.loader = new GLTFLoader(); // 实例化gltf载入库
    const dracoLoader = new DRACOLoader(); // 实例化draco载入库
    dracoLoader.setDecoderPath(options.dracoDecoderPath ?? "./draco/"); // 添加draco载入库
    this.loader.setDRACOLoader(dracoLoader); // 添加draco
  }
}
