import { ArcRotateCamera, type Scene, Vector3, type Mesh, type ArcRotateCameraPointersInput } from "@babylonjs/core";
import gsap from "gsap";
import { debounce } from "lodash-es";

import { cubeWeb3DInstance } from "../web-3d";

const debounceScale = debounce(() => {
  const camera = cubeWeb3DInstance._scene.activeCamera as ArcRotateCamera;
  cubeWeb3DInstance._buildingIconPlaneList.forEach((plane) => {
    const distance = Vector3.Distance(camera.position, plane.absolutePosition);
    let scale = 1;
    if (distance > 100 && distance < 200) {
      scale = 1.5;
    } else if (distance > 200 && distance < 300) {
      scale = 2;
    } else if (distance > 300 && distance < 400) {
      scale = 2.5;
    } else if (distance > 400) {
      scale = 4;
    }
    gsap.to(plane.scaling, {
      duration: 0.1,
      x: scale,
      y: scale,
      z: scale,
      ease: "easeInOutCubic",
    });
  });
}, 100);

/** 处理楼栋标签的状态 */
export const handleBuildingIconPlane = (): void => {
  const camera = cubeWeb3DInstance._scene.activeCamera as ArcRotateCamera;
  cubeWeb3DInstance._buildingIconPlaneList.forEach((plane) => {
    plane.lookAt(camera.position);
  });
  cubeWeb3DInstance._deviceIconPlaneList.forEach((plane) => {
    plane.lookAt(camera.position);
  });
  debounceScale();
};
export function createCamera(scene: Scene): ArcRotateCamera {
  const camera = new ArcRotateCamera("CubeCamera", Math.PI / 2, Math.PI / 2.2, 20000, new Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 0;

  // 获取鼠标指针输入实例
  const pointersInput = camera.inputs.attached.pointers as ArcRotateCameraPointersInput;

  // 监听鼠标操作结束事件
  pointersInput.onButtonUp = (): void => {
    startInteractionCheck();
  };

  const checkTime = 100;
  let interactionTimeout: NodeJS.Timeout;
  const isUserInteracting = false;
  const startInteractionCheck = (): void => {
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
      if (!isUserInteracting) {
        setTargetByCenterRay();
      }
    }, checkTime);
  };

  camera.onViewMatrixChangedObservable.add(() => {
    handleBuildingIconPlane();
    debounce(() => {}, 100);
  });
  return camera;
}

/**
 * 从屏幕中心发射射线，检测碰撞并将相机焦点设置到碰撞点
 */
export function setTargetByCenterRay(): void {
  try {
    const scene = cubeWeb3DInstance._scene;
    const camera = scene.activeCamera as ArcRotateCamera;
    // 获取屏幕中心坐标
    const screenWidth = scene.getEngine().getRenderWidth();
    const screenHeight = scene.getEngine().getRenderHeight();

    // 创建从屏幕中心发射的射线
    const ray = scene.createPickingRay(screenWidth * 0.5, screenHeight * 0.5, camera.getViewMatrix(), camera, true);

    const hit = scene.pickWithRay(ray);
    if (hit?.hit && hit.pickedMesh && hit.pickedPoint && hit.distance > 200) {
      let currentMesh = hit.pickedMesh;
      let pickSuccess = false;
      if (currentMesh.name === "CubeSkyBox") return;
      while (currentMesh.parent) {
        if (currentMesh.parent.name === "CubeMainModel") {
          pickSuccess = true;
        }
        currentMesh = currentMesh.parent as Mesh;
      }

      if (pickSuccess) {
        // 设置相机焦点到碰撞点
        camera.setTarget(hit.pickedPoint);
      }
    }
  } catch (error) {}
}
