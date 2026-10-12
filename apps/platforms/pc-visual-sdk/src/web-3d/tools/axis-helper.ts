import { Vector3, Color4 } from "@babylonjs/core";
import { CreateLines } from "@babylonjs/core/Meshes";

import { cubeWeb3DInstance } from "../web-3d";

export function createAxis(size: number): void {
  const scene = cubeWeb3DInstance._scene;

  // 创建X轴（红色）
  const xAxis = CreateLines(
    "CubeXAxis",
    {
      points: [new Vector3(0, 0, 0), new Vector3(size, 0, 0)],
      colors: [new Color4(1, 0, 0, 1), new Color4(1, 0, 0, 1)],
    },
    scene,
  );
  xAxis.renderingGroupId = 1;

  // 创建Y轴（绿色）
  const yAxis = CreateLines(
    "CubeYAxis",
    {
      points: [new Vector3(0, 0, 0), new Vector3(0, size, 0)],
      colors: [new Color4(0, 1, 0, 1), new Color4(0, 1, 0, 1)],
    },
    scene,
  );
  yAxis.renderingGroupId = 1;

  // 创建Z轴（蓝色）
  const zAxis = CreateLines(
    "CubeZAxis",
    {
      points: [new Vector3(0, 0, 0), new Vector3(0, 0, size)],
      colors: [new Color4(0, 0, 1, 1), new Color4(0, 0, 1, 1)],
    },
    scene,
  );
  zAxis.renderingGroupId = 1;
}
export function removeAxis(): void {
  const scene = cubeWeb3DInstance._scene;
  scene.getMeshByName("CubeXAxis") && scene.getMeshByName("CubeXAxis")?.dispose();
  scene.getMeshByName("CubeYAxis") && scene.getMeshByName("CubeYAxis")?.dispose();
  scene.getMeshByName("CubeZAxis") && scene.getMeshByName("CubeZAxis")?.dispose();
}
