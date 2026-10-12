import { type AbstractMesh, type ArcRotateCamera, Color3, StandardMaterial, type Texture, Vector3 } from "@babylonjs/core";

import { cubeWeb3DInstance } from "../web-3d";

/** 辅助方法：计算合并包围盒 */
export function calculateBoundingBox(meshes: AbstractMesh[]): { min: Vector3; max: Vector3 } {
  const boundingVectors = meshes
    .map((m) => m.getHierarchyBoundingVectors())
    .reduce((acc, curr) => ({
      min: Vector3.Minimize(acc.min, curr.min),
      max: Vector3.Maximize(acc.max, curr.max),
    }));

  return {
    min: boundingVectors.min,
    max: boundingVectors.max,
  };
}

const rotateSpeed = Math.PI / 18000;
let rotateStatus = false;
const handleModelRotate = (): void => {
  const scene = cubeWeb3DInstance._scene;
  const camera = scene.activeCamera as ArcRotateCamera;
  camera.alpha += rotateSpeed;
  if (camera.alpha >= Math.PI * 2) {
    camera.alpha = 0;
  }
};
/**
 * 启动模型绕相机target中心旋转
 */
export function startRotateAroundCameraTarget(): void {
  const scene = cubeWeb3DInstance._scene;
  scene.registerBeforeRender(handleModelRotate);
  rotateStatus = true;
}

/** 停止模型旋转 */
export function stopRotateAroundCameraTarget(): void {
  if (!rotateStatus) return;
  const scene = cubeWeb3DInstance._scene;
  scene.unregisterBeforeRender(handleModelRotate);
}

export async function waitTextureLoad(texture: Texture): Promise<void> {
  if (texture.isReady()) {
    return;
  }
  return new Promise((resolve) => {
    texture.onLoadObservable.add(() => {
      resolve();
    });
  });
}

export async function createMaterialByTexture(texture: Texture): Promise<StandardMaterial> {
  if (cubeWeb3DInstance._scene.getMaterialByName(texture.name)) {
    return cubeWeb3DInstance._scene.getMaterialByName(texture.name) as StandardMaterial;
  }
  await waitTextureLoad(texture);
  const mat2 = new StandardMaterial(texture.name, cubeWeb3DInstance._scene);
  mat2.name = texture.name;
  mat2.diffuseTexture = texture;
  mat2.emissiveColor = new Color3(1, 1, 1);
  mat2.disableLighting = false; // 保持光照影响
  mat2.backFaceCulling = false; // 关闭背面剔除
  mat2.alpha = 1;
  mat2.specularColor = new Color3(0, 0, 0);
  mat2.useAlphaFromDiffuseTexture = true; // 使用纹理alpha通道
  return mat2;
}
