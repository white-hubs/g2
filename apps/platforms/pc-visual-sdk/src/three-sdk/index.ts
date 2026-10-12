import TWEEN, { type Tween } from "@tweenjs/tween.js";
import keymaster from "keymaster";
import * as THREE from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { h, createApp } from "vue";

import ThreePlugin from "./three-plugin/index";
import { LoadingContainer } from "./three-tools/loading-container";
import RainEffect from "./three-tools/rain-effect";
import SnowEffect from "./three-tools/snow-effect";
import { getUniqueId } from "./utils";
import { CardLabel } from "./visual-label/card-label";
import { TextLabel } from "./visual-label/text-label";
import { FireEffect } from "./visual-special-effects/fire";
import { SmokeEffect } from "./visual-special-effects/smoke";
const controlsConfig = {
  openMouseControls: false,
  openKeyboardControls: false,
};
interface CameraConfig {
  location: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}
interface CameraAnimation {
  positionTween: Tween<THREE.Vector3> | null;
  rotationTween: Tween<THREE.Euler> | null;
}
export default class GhyThree extends ThreePlugin {
  public debugPanel: GUI | null = null;
  private readonly initFloorMap = new Map<string, THREE.Vector3>();
  private readonly labels = new Map<string, CSS2DObject>();
  private readonly modelMap = new Map<string, THREE.Group>();
  private readonly cameraAnimation: CameraAnimation = {
    positionTween: null,
    rotationTween: null,
  };

  private prevCameraConfig: CameraConfig = {
    location: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
  };

  /** 漫游状态 true 漫游中 */
  private inRoamInspect = false;

  // 初始化模型
  public async initModel(filePath: string, cameraConfig?: CameraConfig): Promise<GhyThree> {
    await this.init(filePath);
    this.modelMap.set(filePath, this.model);
    this.modelPath = filePath;
    cameraConfig && (await this.moveCamera(cameraConfig));
    this.handleReSize();
    this.keyboardEventSign();
    this.enabledControlRange && this.setControlRange();
    this.enabledRoamEdit && this.openEditRoamModel();
    return this;
  }

  public setModelBackground(filePath: string, callback: () => void): void {
    if (this.imageContainer) {
      this.container.removeChild(this.imageContainer);
      this.imageContainer = null;
    }
    const handleCallBack = (): void => {
      callback();
      this.backgroundLoadingProgressContainer = this.imageContainer?.querySelector("#loading-progress") as unknown as HTMLDivElement;
      this.loadingTextContainer = this.imageContainer?.querySelector("#loading-progress-text") as unknown as HTMLDivElement;
    };
    this.imageContainer = new LoadingContainer().initBackgroundContainer(filePath, handleCallBack);
    this.container.appendChild(this.imageContainer);
  }

  // 展示面板及UI
  public showDebugPanel(): void {
    this.initCameraPanel();
    this.initStats();
  }

  public getCameraParams(camera = this.camera): CameraConfig {
    if (!camera) {
      throw new Error("未初始化相机");
    }
    const cameraInfo = {
      location: { ...camera.position },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
      },
    };
    return cameraInfo;
  }

  // 隐藏面板及UI
  public hideDebugPanel(): void {
    this.stats && this.container.removeChild(this.stats.dom);
    this.debugPanel?.destroy();
    this.stats = null;
    this.debugPanel = null;
  }

  // 切换模型
  public async changeModel(filePath: string, cameraConfig?: CameraConfig): Promise<void> {
    if (!this.scene) {
      throw new Error("scene is not init");
    }
    this.scene.remove(this.model);
    if (this.modelMap.has(filePath)) {
      this.model = this.modelMap.get(filePath) as unknown as THREE.Group<THREE.Object3DEventMap>;
      this.scene.add(this.model);
      cameraConfig && (await this.moveCamera(cameraConfig));
      return;
    }
    await this.setModel(filePath);
    this.modelPath = filePath;
    this.modelMap.set(filePath, this.model);
    cameraConfig && (await this.moveCamera(cameraConfig));
  }

  // 点击获取坐标
  public addListenClick(callback: (location: THREE.Vector3) => void): void {
    this.container.addEventListener("click", (e) => {
      if (!this.camera || !this.scene) {
        throw new Error("camera or scene is not init");
      }
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const getBoundingClientRect = this.container.getBoundingClientRect();
      const { offsetHeight, offsetWidth } = this.container;
      mouse.x = ((e.clientX - getBoundingClientRect.left) / offsetWidth) * 2 - 1;
      mouse.y = -((e.clientY - getBoundingClientRect.top) / offsetHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const object = intersect.object;
        const intersectPoint = intersect.point;
        callback(intersectPoint);
      }
    });
  }

  // 返回上一个视角
  public async backLastCamera(): Promise<void> {
    const cameraConfig = this.prevCameraConfig;
    await this.moveCamera(cameraConfig);
  }

  // 设置展示某建筑
  public setShowBuilding(buildingNames: string[]): ThreePlugin {
    this.model.children[0].children.forEach((child) => {
      if (buildingNames.includes(child.name)) {
        child.visible = true;
      } else {
        child.visible = false;
      }
    });
    return this;
  }

  public updateLight(name: string): void {
    if (name === "day") {
      this.initDayLight();
    } else if (name === "night") {
      this.initNightLight();
    } else {
      this.initDuskLight();
    }
  }

  //  移动相机位置
  public async moveCamera(
    cameraConfig: CameraConfig,
    option = {
      caclAnimateTime: false,
      speed: 0.3,
    },
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.camera) {
        throw new Error("camera is not init");
      }

      let animateTime = 1000;
      if (option.caclAnimateTime) {
        const distance = this.camera.position.distanceTo(
          new THREE.Vector3(cameraConfig.location.x, cameraConfig.location.y, cameraConfig.location.z),
        );
        animateTime = (distance / option.speed) * 20000;
      }

      this.cameraAnimation.positionTween = new TWEEN.Tween(this.camera.position);
      this.cameraAnimation.positionTween
        .to(cameraConfig.location, animateTime)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start()
        .onComplete(() => {
          resolve();
        });
      this.cameraAnimation.rotationTween = new TWEEN.Tween(this.camera.rotation);
      !this.inRoamInspect &&
        this.cameraAnimation.rotationTween
          .to(cameraConfig.rotation, animateTime)
          .easing(TWEEN.Easing.Quadratic.In)
          .start()
          .onComplete(() => {
            // 根据当前相机位置及旋转信息设置控制器
            this.setCameraControl();
          });
    });
  }

  public async lookAtWithAnimation(rotation: { x: number; y: number; z: number }): Promise<void> {
    return new Promise((resolve) => {
      if (!this.camera || !this.auxiliaryCamera) {
        throw new Error("camera is not init");
      }
      const rotationTween = new TWEEN.Tween(this.camera.rotation);
      rotationTween
        .to(rotation, 100)
        .easing(TWEEN.Easing.Quadratic.In)
        .start()
        .onComplete(() => {
          resolve();
        });
    });
  }

  /** 开始漫游 */
  public async startRoamInspect(
    routeList: { modelPath: string; camera: CameraConfig }[] = [],
    index = 0,
    outSideCall = true,
  ): Promise<void> {
    if (this.inRoamInspect && outSideCall) {
      this.stopRoamInspect();
    }
    if (routeList.length < 2) {
      throw new Error("漫游路径至少为2个");
    }
    const viewAngle = routeList[index].camera;
    const modelPath = routeList[index].modelPath;
    this.inRoamInspect = true;
    // 是否需要切换模型
    const needChangeModel = modelPath !== this.modelPath;
    if (!needChangeModel) {
      if (index === 0) {
        await this.moveCamera(viewAngle);
      } else {
        // 相机方向偏移
        await this.lookAtWithAnimation(viewAngle.rotation);
        // 相机移动
        await this.moveCamera(viewAngle, { caclAnimateTime: true, speed: 0.3 });
      }
    } else {
      this.changeModel(modelPath, viewAngle);
    }

    this.inRoamInspect && this.startRoamInspect(routeList, index === routeList.length - 1 ? 0 : index + 1, false);
  }

  /** 停止漫游 */
  public async stopRoamInspect(): Promise<void> {
    TWEEN.removeAll();
    this.inRoamInspect = false;
  }

  /** 暂停漫游 */
  public async pauseRoamInspect(): Promise<void> {
    if (this.cameraAnimation.positionTween && this.cameraAnimation.rotationTween) {
      if (this.inRoamInspect) {
        this.cameraAnimation.positionTween.pause();
        this.cameraAnimation.rotationTween.pause();
      } else {
        this.cameraAnimation.positionTween.resume();
        this.cameraAnimation.rotationTween.resume();
      }
      this.inRoamInspect = !this.inRoamInspect;
    }
  }

  // 开始环游
  public startRotate(targetName?: string, speed: number = 1.5): void {
    const mesh = targetName ? this.model.getObjectByName(targetName) : null;
    const rotatePosition = mesh ? mesh.getWorldPosition(new THREE.Vector3()) : this.getFirstIntersectionPoint();
    this.setCurrentView(rotatePosition);
    this.cameraAroundControl.target.set(rotatePosition.x, rotatePosition.y, rotatePosition.z);
    // 设置autoRotateSpeed为旋转的速度
    this.cameraAroundControl.autoRotateSpeed = speed;
    this.openTourAround = true;
    this.controls.enabled = false;
  }

  // 停止环游并初始化相机
  public async endRotateInitCamera(): Promise<void> {
    this.openTourAround = false;
    await this.moveCamera(this.prevCameraConfig);
    this.controls.enabled = true;
  }

  // 视角定位到指定物体
  public focusOnObjectByName(meshName: string): void {
    if (!this.camera) {
      throw new Error("camera is not init");
    }
    if (this.openTourAround) {
      return;
    }
    const object = this.model.getObjectByName(meshName);
    if (!object) {
      throw new Error(`${meshName} is not exist`);
    }
    const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    const centerPosition = object.getWorldPosition(new THREE.Vector3());
    const positionTween = new TWEEN.Tween(this.camera.position);
    // 计算目标位置
    // Const targetPosition = {
    //   X: centerPosition.x + (-distance * 0.05),
    //   Y: centerPosition.y + (-distance * 0.01),
    //   Z: centerPosition.z + (-distance * 0.01)
    // }
    const targetPosition = {
      x: centerPosition.x + size.x * 20,
      y: centerPosition.y + size.y * 30,
      z: centerPosition.z + size.z * 10,
    };
    this.setCurrentView(targetPosition);
    positionTween
      .to(
        {
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
        },
        1000,
      )
      .onUpdate(() => {
        this.camera?.lookAt(centerPosition);
      })
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
      .onComplete(() => {
        this.setCameraControl();
      });
  }

  public setCurrentView(targetPosition: { x: number; y: number; z: number }): void {
    const currentView = this.getCurrentView();
    if (
      Math.abs(currentView.location.x - targetPosition.x) < 0.1 &&
      Math.abs(currentView.location.y - targetPosition.y) < 0.1 &&
      Math.abs(currentView.location.z - targetPosition.z) < 0.1
    ) {
      return;
    }
    this.prevCameraConfig = currentView;
  }

  // 设置雾
  public startFog(): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    this.stopRain();
    this.stopSnow();
    const color = 0xffffff; // White
    const near = -100;
    const far = 100;
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  // 开始下雪
  public startSnow(): void {
    if (!this.scene || !this.camera) {
      throw new Error("场景或相机为空");
    }
    this.stopRain();
    this.snowEffect = new SnowEffect(this.scene, this.camera);
    this.scene.fog = null;
  }

  public setSunny(): void {
    this.stopRain();
    this.stopSnow();
    this.directionalLight.intensity = 5;
    this.directionalLight.castShadow = true;
  }

  // 设置多云天气
  public setDuskLight(): void {
    this.stopRain();
    this.stopSnow();
    this.directionalLight.intensity = 2;
    this.directionalLight.castShadow = false;
  }

  // 停止下雪
  public stopSnow(): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    this.snowEffect?.removeSnow();
    this.snowEffect = null;
    this.scene.fog = null;
  }

  // 开始下雨
  public startRain(): void {
    if (!this.scene || !this.camera) {
      throw new Error("场景为空");
    }
    this.stopSnow();
    this.rainEffect = new RainEffect(this.scene, this.camera);
    this.scene.fog = null;
  }

  // 停止下雨
  public stopRain(): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    this.rainEffect?.removeRain();
    this.rainEffect = null;
    this.scene.fog = null;
  }

  // 设置隐藏楼层
  public switchVisibleCheckMode(buildName: string, floorNames: string[]): void {
    const buildObject = this.model.getObjectByName(buildName);
    if (!buildObject) {
      return;
    }
    buildObject.children.forEach((object) => {
      if (!floorNames.includes(object.name)) {
        object.visible = false;
      } else {
        object.visible = true;
      }
    });
  }
  // 设置动画显示楼层

  public async animationShowFloor(buildName: string, floorNames: string[]): Promise<boolean> {
    const buildObject = this.model.getObjectByName(buildName);
    if (!buildObject) {
      throw new Error("建筑不存在");
    }
    for (const object of buildObject.children) {
      if (!floorNames.includes(object.name)) {
        // 记录初始位置
        if (!this.initFloorMap.has(object.name)) {
          this.initFloorMap.set(object.name, JSON.parse(JSON.stringify(object.position)));
        }
        // 动画移动
        const animation = new TWEEN.Tween(object.position);
        animation
          .to({ y: object.position.y + 0.2, z: object.position.z, x: object.position.x }, 200)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .start()
          .onComplete(() => {
            object.visible = false;
          });
      } else {
        object.visible = true;
        // 获取初始位置
        const initPosition = this.initFloorMap.get(object.name);
        if (initPosition) {
          // 动画移动
          const animation = new TWEEN.Tween(object.position);
          animation.to({ y: initPosition.y, z: initPosition.z, x: initPosition.x }, 200).easing(TWEEN.Easing.Quadratic.InOut).start();
        }
      }
    }
    return true;
  }

  // 还原楼层
  public resetFloor(): void {
    if (this.initFloorMap.size === 0) {
      return;
    }
    this.model.traverse((object) => {
      const floorPosition = this.initFloorMap.get(object.name);
      if (floorPosition) {
        this.initFloorMap.delete(object.name);
        const animation = new TWEEN.Tween(object.position);
        object.visible = true;
        animation.to({ y: floorPosition.y, z: floorPosition.z, x: floorPosition.x }, 2000).easing(TWEEN.Easing.Quadratic.InOut).start();
      }
    });
  }

  // 根据坐标新增标签
  public addLabelByLocation(labelDom: HTMLElement, location: THREE.Vector3): CSS2DObject {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    const label = new CSS2DObject(labelDom);
    label.position.set(location.x, location.y, location.z);
    label.name = labelDom.id;
    this.labels.set(labelDom.id, label);
    this.scene.add(label);
    return label;
  }

  // 根据名称新增标签
  public addLabelByObjectName(labelDom: HTMLElement, name: string): CSS2DObject {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    const object = this.model.getObjectByName(name) as unknown as THREE.Object3D<THREE.Object3DEventMap>;
    if (!object) {
      throw new Error(`未查询到${name}的模型`);
    }
    const meshBox = new THREE.Box3().setFromObject(object);
    const meshSize = meshBox.getSize(new THREE.Vector3());
    const meshCenter = meshBox.getCenter(new THREE.Vector3());
    const tagPosition = {
      x: meshCenter.x,
      y: meshSize.y / 2 + meshCenter.y,
      z: meshCenter.z,
    };
    const label = new CSS2DObject(labelDom);
    label.position.set(tagPosition.x, tagPosition.y, tagPosition.z);
    label.name = labelDom.id;
    this.labels.set(labelDom.id, label);
    this.scene.add(label);
    return label;
  }

  // 新增文本标签
  public addTextLabel(
    params: {
      backgroundColor: string;
      title: string;
      interactive: string;
      location?: {
        x: number;
        y: number;
        z: number;
      };
    },
    modelConfig?: {
      name?: string;
      cameraConfig?: CameraConfig;
      callback?: () => void;
    },
  ): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    const app = createApp({
      render() {
        return h(TextLabel, {
          title: params.title,
          backgroundColor: params.backgroundColor,
        });
      },
    });
    const container = document.createElement("div");
    container.style.cursor = "pointer";

    // @ts-expect-error
    container.style["pointer-events"] = "auto";
    container.onclick = () => {
      if (params.location) {
        this.focusToLocation(params.location);
      } else {
        if (!modelConfig?.name) {
          throw new Error("模型名称不能为空");
        }
        if (modelConfig.cameraConfig) {
          this.moveCamera(modelConfig.cameraConfig);
        } else {
          this.focusOnObjectByBuildName(modelConfig.name);
        }
        modelConfig.callback?.();
      }
    };
    app.mount(container);
    let tagPosition = {
      x: 0,
      y: 0,
      z: 0,
    };
    if (params.location) {
      tagPosition = {
        x: +params.location.x,
        y: +params.location.y + 0.01,
        z: +params.location.z,
      };
    } else {
      if (!modelConfig?.name) {
        throw new Error("模型名称不能为空");
      }
      const object = this.model.getObjectByName(modelConfig.name) as unknown as THREE.Object3D<THREE.Object3DEventMap>;
      if (!object) {
        throw new Error(`未查询到${modelConfig.name}的模型`);
      }
      const meshBox = new THREE.Box3().setFromObject(object);
      const meshSize = meshBox.getSize(new THREE.Vector3());
      const meshCenter = meshBox.getCenter(new THREE.Vector3());
      tagPosition = {
        x: meshCenter.x,
        y: meshSize.y / 1.2 + meshCenter.y,
        z: meshCenter.z,
      };
    }

    const label = new CSS2DObject(container);
    label.position.set(tagPosition.x, tagPosition.y, tagPosition.z);
    const id = getUniqueId();
    label.name = id;
    this.labels.set(id, label);
    this.scene.add(label);
  }

  public addCardLabel(
    params: {
      backgroundColor: string;
      title: string;
      interactive: string;
      detail: string;
      image: string;
      location?: {
        x: number;
        y: number;
        z: number;
      };
    },
    modelConfig?: {
      name?: string;
      cameraConfig?: CameraConfig;
      callback?: () => void;
    },
  ): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    const app = createApp({
      render() {
        return h(CardLabel, {
          title: params.title,
          image: params.image,
          detail: params.detail,
          backgroundColor: params.backgroundColor,
        });
      },
    });
    const container = document.createElement("div");
    container.style.cursor = "pointer";

    // @ts-expect-error
    container.style["pointer-events"] = "auto";
    container.onclick = () => {
      if (params.location) {
        this.focusToLocation(params.location);
      } else {
        if (!modelConfig?.name) {
          throw new Error("模型名称不能为空");
        }
        if (modelConfig.cameraConfig) {
          this.moveCamera(modelConfig.cameraConfig);
        } else {
          this.focusOnObjectByBuildName(modelConfig.name);
        }
        modelConfig.callback?.();
      }
    };
    let tagPosition = {
      x: 0,
      y: 0,
      z: 0,
    };
    app.mount(container);
    if (params.location) {
      tagPosition = {
        x: params.location.x,
        y: params.location.y + 0.01,
        z: params.location.z,
      };
    } else {
      if (!modelConfig?.name) {
        return;
      }
      const object = this.model.getObjectByName(modelConfig.name) as unknown as THREE.Object3D<THREE.Object3DEventMap>;
      if (!object) {
        throw new Error(`未查询到${modelConfig.name}的模型`);
      }
      const meshBox = new THREE.Box3().setFromObject(object);
      const meshSize = meshBox.getSize(new THREE.Vector3());
      const meshCenter = meshBox.getCenter(new THREE.Vector3());
      tagPosition = {
        x: meshCenter.x,
        y: meshSize.y + meshCenter.y,
        z: meshCenter.z,
      };
    }
    const label = new CSS2DObject(container);
    label.position.set(tagPosition.x, tagPosition.y, tagPosition.z);
    const id = getUniqueId();
    label.name = id;
    this.labels.set(id, label);
    this.scene.add(label);
  }

  // 增加火焰特效
  public addEffectByObjectName(type: "fire" | "smoke", name: string): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    const object = this.model.getObjectByName(name) as unknown as THREE.Object3D<THREE.Object3DEventMap>;
    if (!object) {
      throw new Error(`未查询到${name}的模型`);
    }
    const meshBox = new THREE.Box3().setFromObject(object);
    const meshSize = meshBox.getSize(new THREE.Vector3());
    const meshCenter = meshBox.getCenter(new THREE.Vector3());
    const tagPosition = {
      x: meshCenter.x,
      y: meshSize.y / 2 + meshCenter.y,
      z: meshCenter.z,
    };
    const typeComponent = {
      fire: FireEffect,
      smoke: SmokeEffect,
    };
    const app = createApp({
      render() {
        return h(typeComponent[type] ?? FireEffect);
      },
    });
    const container = document.createElement("div");
    app.mount(container);
    const label = new CSS2DObject(container);
    label.position.set(tagPosition.x, tagPosition.y, tagPosition.z);
    label.name = name;
    this.labels.set(name, label);
    this.scene.add(label);
  }

  // 清除所有楼栋标签
  public clearAllLabel(): void {
    if (!this.scene) {
      throw new Error("场景为空");
    }
    this.labels.forEach((label) => {
      this.scene?.remove(label);
    });
  }

  // 获取当前视角
  public getCurrentView(): CameraConfig {
    if (!this.camera) {
      throw new Error("未初始化相机");
    }
    return {
      location: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z,
      },
    };
  }

  public destroyScene(): void {
    try {
      window.removeEventListener("resize", this.handleResize);
      this.renderAnimation && cancelAnimationFrame(this.renderAnimation);
      this.renderer && this.renderer.dispose();
      this.renderer && this.renderer.forceContextLoss();
      this.renderer = null;
      this.camera = null;
      this.scene = null;
    } catch {
      throw new Error("Failed to destroy threejs");
    }
  }

  public getRoamPerspective(): CameraConfig {
    if (!this.coneMesh) {
      throw new Error("未初始化漫游设置对象");
    }
    if (!this.camera) {
      throw new Error("未初始化相机");
    }
    const location = {
      x: this.coneMesh.position.x,
      y: this.coneMesh.position.y,
      z: this.coneMesh.position.z,
    };
    const rotation = {
      x: this.camera.rotation.x,
      y: this.camera.rotation.y,
      z: this.camera.rotation.z,
    };
    return {
      location,
      rotation,
    };
  }

  // 自适应屏幕大小渲染
  private readonly handleReSize = (): void => {
    window.addEventListener("resize", this.handleResize);
  };

  //  相机聚焦移动到指定坐标
  private focusToLocation(location: { x: number; y: number; z: number }): void {
    if (!this.camera) {
      return;
    }
    const positionTween = new TWEEN.Tween(this.camera.position);
    const centerPosition = new THREE.Vector3(location.x, location.y, location.z);
    const targetPosition = {
      x: centerPosition.x + 0.01,
      y: centerPosition.y + 0.05,
      z: centerPosition.z + 0.01,
    };
    this.setCurrentView(location);
    positionTween
      .to(
        {
          ...targetPosition,
        },
        2000,
      )
      .onUpdate(() => {
        this.camera?.lookAt(centerPosition);
        this.setCameraControl();
      })
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }

  private focusOnObjectByBuildName(meshName: string): void {
    if (!this.camera) {
      throw new Error("camera is not init");
    }
    if (this.openTourAround) {
      return;
    }
    const object = this.model.getObjectByName(meshName);
    if (!object) {
      throw new Error(`${meshName} is not exist`);
    }
    const distance = new THREE.Box3().setFromObject(object).max.y;
    const centerPosition = object.getWorldPosition(new THREE.Vector3());
    const positionTween = new TWEEN.Tween(this.camera.position);
    // 计算目标位置
    const targetPosition = {
      x: centerPosition.x - distance * 0.03,
      y: centerPosition.y + distance - 0.05,
      z: centerPosition.z + distance,
    };
    this.setCurrentView(targetPosition);
    positionTween
      .to(
        {
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
        },
        1000,
      )
      .onUpdate(() => {
        this.camera?.lookAt(centerPosition);
      })
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
      .onComplete(() => {
        this.setCameraControl();
      });
  }

  /**
   * 处理窗口变化适配
   */
  private readonly handleResize = (): void => {
    if (!this.renderer || !this.camera || !this.css2DRenderer) {
      throw new Error("not init");
    }
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight); // 设置渲染器宽高
    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight; // 设置相机宽高比
    this.camera.updateProjectionMatrix(); // 执行更新
    this.css2DRenderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  };

  // 初始化相机GUI
  private initCameraPanel(): void {
    if (!this.camera) {
      throw new Error("未初始化相机");
    }
    this.debugPanel = new GUI({ title: "调试面板" });
    this.debugPanel
      .add(controlsConfig, "openMouseControls")
      .name("开启鼠标控制")
      .onChange((value: boolean) => {
        this.controls.enabled = value;
      });
    this.debugPanel
      .add(controlsConfig, "openKeyboardControls")
      .name("开启键盘控制")
      .onChange((value: boolean) => {
        this.keyboardControls && (this.keyboardControls.enabled = value);
      });
    const cameraParams = this.debugPanel.addFolder("镜头视角参数").close();
    cameraParams.add(this.camera.position, "x").name("位置-x").step(10).listen();
    cameraParams.add(this.camera.position, "y").name("位置-y").step(10).listen();
    cameraParams.add(this.camera.position, "z").name("位置-z").step(10).listen();
    cameraParams.add(this.camera.rotation, "x").name("相机旋转-x").step(0.01).listen();
    cameraParams.add(this.camera.rotation, "y").name("相机旋转-y").step(0.01).listen();
    cameraParams.add(this.camera.rotation, "z").name("相机旋转-z").step(0.01).listen();
    cameraParams
      .add(
        {
          do: () => {
            this.copyCameraParams();
          },
        },
        "do",
      )
      .name("一键复制镜头视角参数");
  }

  /** 键盘组合事件监听 */
  private keyboardEventSign(): void {
    // 监听切换GUI面板组合键
    keymaster("ctrl+/", () => {
      if (!this.stats) {
        this.showDebugPanel();
      } else {
        this.hideDebugPanel();
      }
    });
  }

  // 复制模型参数GUI
  private copyCameraParams(): void {
    if (!this.camera) {
      throw new Error("未初始化相机");
    }
    const res = {
      location: { ...this.camera.position },
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(res));
  }

  private getFirstIntersectionPoint(): THREE.Vector3 {
    if (!this.camera || !this.scene) {
      throw new Error("相机或场景未初始化");
    }

    const raycaster = new THREE.Raycaster();
    // 从相机位置向正前方发射射线
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // 获取与场景中物体的交点
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      // 返回第一个交点的坐标
      return intersects[0].point;
    }
    return this.model.getWorldPosition(new THREE.Vector3());
  }
}
