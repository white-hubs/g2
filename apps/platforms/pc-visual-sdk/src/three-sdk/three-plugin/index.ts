import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
// @ts-expect-error
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module";

import type KeyboardControls from "../three-tools/keyboard-controls";
import { FlyControls } from "../three-tools/keyboard-controls/fly-controls.js";
import { LoadingContainer } from "../three-tools/loading-container";
import { ModelLoader } from "../three-tools/model-loader";
import type RainEffect from "../three-tools/rain-effect";
import type SnowEffect from "../three-tools/snow-effect";
import { lightConfig } from "./constant";
// 基础类
interface LoaderMap {
  glb: GLTFLoader;
  fbx: FBXLoader;
  gltf: GLTFLoader;
  obj: OBJLoader;
  stl: STLLoader;
}
export default class ThreePlugin {
  public camera: THREE.PerspectiveCamera | null = null;
  /** 辅助相机 */
  public auxiliaryCamera: THREE.PerspectiveCamera | null = null;
  public scene: THREE.Scene | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  public css2DRenderer: CSS2DRenderer | null = null;
  public ambientLight: THREE.AmbientLight | null = null;
  // 加载进度监听
  public bulbList: unknown[] = [];
  //
  public fileLoaderMap: LoaderMap = {
    glb: new GLTFLoader(),
    fbx: new FBXLoader(),
    gltf: new GLTFLoader(),
    obj: new OBJLoader(),
    stl: new STLLoader(),
  };

  public modelPath = "";
  public animateClipAction!: THREE.AnimationAction;
  public stats: Stats | null = null;
  public container: HTMLDivElement;
  // model
  public model!: THREE.Group<THREE.Object3DEventMap>;
  // 进度
  public modelProgressCallback!: (progress: number) => void;
  // 开启环游
  public openTourAround: boolean = false;
  // 鼠标轨道控制器
  public controls!: OrbitControls;
  public cameraAroundControl!: OrbitControls;
  // 几何体模型
  public modelAnimation!: THREE.AnimationClip[];
  public animationMixer!: THREE.AnimationMixer;
  public animationClock: THREE.Clock = new THREE.Clock();
  public animationFrame!: null | number;
  public rotationAnimationFrame!: null | number;
  public directionalLight!: THREE.DirectionalLight;
  public renderAnimation!: null | number;
  public loadingStatus: boolean = false;
  public loopMap: Record<string, THREE.AnimationActionLoopStyles> = {
    LoopOnce: THREE.LoopOnce,
    LoopRepeat: THREE.LoopRepeat,
    LoopPingPong: THREE.LoopPingPong,
  };

  protected keyboardControls: KeyboardControls | null = null;
  protected readonly enabledKeyboardControl: boolean = false;
  protected readonly enabledRoamEdit: boolean = false;
  protected readonly enabledControlRange: boolean = true;
  protected rainEffect: RainEffect | null = null;
  protected imageContainer: HTMLDivElement | null = null;
  protected snowEffect: SnowEffect | null = null;
  protected coneMesh: THREE.Mesh | null = null;
  protected loadingContainer: HTMLDivElement | null = null;
  protected backgroundLoadingProgressContainer: HTMLDivElement | null = null;
  protected loadingTextContainer: HTMLDivElement | null = null;
  private readonly nightBulbLight: THREE.PointLight[] = [];
  private readonly enabledMouseControl: boolean = false;
  public constructor(option: Option) {
    this.container = document.getElementById(option.elementId) as HTMLDivElement;
    if (!this.container) {
      throw new Error(`No element with id ${option.elementId} found'`);
    }
    this.enabledMouseControl = option.enabledMouseControl ?? false;
    this.enabledKeyboardControl = option.enabledKeyBoardControl ?? false;
    this.enabledControlRange = option.enabledControlRange ?? true;
    this.enabledRoamEdit = option.enabledRoamEdit ?? false;
    // 初始化渲染器
    this.initRenderer();
    // 初始化相机
    this.initCamera();
    // 初始化场景
    this.initScene();
    // 初始化控制器
    this.initControls();
    // 初始化光源
    this.createLight();
    this.sceneAnimation();
  }

  // 进度
  public onProgress(callback: (progress: number) => void): void {
    if (typeof callback === "function") {
      this.modelProgressCallback = callback;
    }
  }

  // 初始化
  public async init(filePath: string): Promise<boolean> {
    // 场景渲染
    const load = await this.setModel(filePath);
    this.onStartModelAnimation();
    return load;
  }

  // 加载模型
  protected async setModel(filePath: string): Promise<boolean> {
    if (!this.scene) {
      throw new Error("scene is null");
    }
    this.loadingStatus = false;
    const modelLoader = new ModelLoader({});
    if (!this.imageContainer) {
      this.initLoadingStyle();
    }
    const result = await modelLoader.load(filePath, (progress: number) => {
      this.loadingProgress(progress);
    });
    this.model = result.scene;
    this.handleSceneShadow();
    this.setModelPositionSize();
    // this.setCameraControl()
    this.scene.add(this.model);
    this.getModelAnimationList(result);
    if (this.loadingContainer) {
      this.loadingContainer.remove();
      this.loadingContainer = null;
    }
    if (this.imageContainer) {
      this.imageContainer.remove();
      this.imageContainer = null;
    }
    return true;
  }

  // 设置模型位置
  protected setModelPositionSize(): void {
    if (!this.camera) {
      throw new Error("camera is null");
    }
    // 设置模型位置
    this.model.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z); // 计算缩放比例

    const targetSize = 2.5; // 目标大小
    const scale = targetSize / (maxSize > 1 ? maxSize : 0.5);

    this.model.scale.set(scale, scale, scale);
    // 设置模型位置
    this.model.position.sub(center.multiplyScalar(scale));
    // 设置控制器最小缩放值
    // 设置相机位置
    this.camera.position.set(0, 2, 6);
    this.controls.update();
    // 设置相机坐标系
    this.camera.updateProjectionMatrix();
    this.loadingStatus = true;
  }

  // 根据相机位置设置控制器
  protected setCameraControl(): void {
    if (!this.camera) {
      throw new Error("camera is null");
    }
    const dir = new THREE.Vector3();
    // 获取相机的视线方向
    this.camera.getWorldDirection(dir);
    this.controls.target.copy(this.camera.position).add(dir);
  }

  // 初始化loading
  protected initLoadingStyle(): void {
    this.loadingContainer = new LoadingContainer().initLogoLoadingContainer();
    this.loadingTextContainer = this.loadingContainer?.querySelector("#loading-progress-text-container");
    this.container.appendChild(this.loadingContainer);
  }

  protected loadingProgress(progress: number): void {
    if (!this.imageContainer) {
      if (this.loadingTextContainer) {
        this.loadingTextContainer.innerText = `${progress}%`;
      }
    } else {
      if (this.loadingTextContainer) {
        this.loadingTextContainer.innerText = `${progress}%`;
      }
      if (this.backgroundLoadingProgressContainer) {
        this.backgroundLoadingProgressContainer.style.width = `${progress}%`;
      }
    }
  }

  // 初始化白天的灯光
  protected initDayLight(): void {
    if (!this.scene) {
      throw new Error("scene is null");
    }
    this.clearNightBulb();
    const tweenIntensity = new TWEEN.Tween(this.directionalLight);
    const tweenPosition = new TWEEN.Tween(this.directionalLight.position);
    tweenIntensity
      .to(
        {
          intensity: lightConfig.dayLightConfig.intensity,
        },
        1000,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    tweenPosition
      .to(
        {
          x: -15,
          y: 10,
          z: 3,
        },
        1000,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    this.directionalLight.color = new THREE.Color(0xffffff);
    this.scene.background = lightConfig.dayLightConfig.sceneBackground;
    this.scene.environment = lightConfig.dayLightConfig.sceneEnvironment;
  }

  // 初始化夜晚的灯光
  protected initNightLight(): void {
    if (!this.scene) {
      throw new Error("scene is null");
    }
    const tweenIntensity = new TWEEN.Tween(this.directionalLight);
    tweenIntensity
      .to(
        {
          intensity: lightConfig.nightLightConfig.intensity,
        },
        1000,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    this.scene.background = lightConfig.nightLightConfig.sceneBackground;
    this.scene.environment = lightConfig.nightLightConfig.sceneEnvironment;
    this.createBulbLight();
  }

  protected initDuskLight(): void {
    if (!this.scene) {
      throw new Error("scene is null");
    }
    this.clearNightBulb();
    const tweenIntensity = new TWEEN.Tween(this.directionalLight);
    const tweenPosition = new TWEEN.Tween(this.directionalLight.position);
    tweenIntensity
      .to(
        {
          intensity: 2,
        },
        1000,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    tweenPosition
      .to(
        {
          x: 15,
          y: 10,
          z: 3,
        },
        1000,
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    this.directionalLight.color = new THREE.Color(0xffa500);
    this.scene.background = lightConfig.twilightLightConfig.sceneBackground;
    this.scene.environment = lightConfig.twilightLightConfig.sceneEnvironment;
  }

  // 初始化帧率检测器
  protected initStats(): void {
    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);
  }

  // 设置控制器缩放范围
  protected setControlRange(): void {
    if (!this.camera) {
      throw new Error("camera is null");
    }
    // 计算
    const box = new THREE.Box3().setFromObject(this.model);
    // // 将模型放置在中心点
    // const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3());
    // 计算相机的初始距离
    const max = Math.max(...size) / 2;
    const min = Math.min(...size) / 2;
    this.controls.maxDistance = max;
    this.controls.minDistance = min;
    // 限制不能旋转到模型底部
    this.controls.maxPolarAngle = Math.PI / 2.3;
    this.controls.minPolarAngle = 0;
    this.controls.update();
  }

  /**
   * 开启编辑漫游模式
   */
  protected openEditRoamModel(): void {
    const axesHelper = new THREE.AxesHelper(5);
    this.scene?.add(axesHelper);
    this.createConeGeometry();
    this.container.tabIndex = 0;
    this.container.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!this.coneMesh) return;
      if (e.key === "w") {
        this.coneMesh.position.z -= 0.006;
      }
      if (e.key === "s") {
        this.coneMesh.position.z += 0.006;
      }
      if (e.key === "a") {
        this.coneMesh.position.x -= 0.006;
      }
      if (e.key === "d") {
        this.coneMesh.position.x += 0.006;
      }
      if (e.key === "q") {
        this.coneMesh.position.y += 0.006;
      }
      if (e.key === "e") {
        if (this.model.position.y >= this.coneMesh.position.y - 0.006) {
          return;
        }
        this.coneMesh.position.y -= 0.006;
      }
    });
  }

  /**
   * 创建一个椎体
   */
  private createConeGeometry(): void {
    const material = [new THREE.MeshPhongMaterial({ color: 0x0000ff }), new THREE.MeshPhongMaterial({ color: 0x000000, wireframe: true })];
    const geometry = new THREE.ConeGeometry(0.01, 0.02, 4);
    this.coneMesh = new THREE.Mesh(geometry, material);
    this.coneMesh.position.set(0, this.model.position.y, 0);
    this.scene?.add(this.coneMesh);
  }

  // 初始化相机
  private initCamera(): void {
    const { clientHeight, clientWidth } = this.container;
    this.camera = new THREE.PerspectiveCamera(30, clientWidth / clientHeight, 0.0001, 500000);
    this.auxiliaryCamera = new THREE.PerspectiveCamera(30, clientWidth / clientHeight, 0.0001, 500000);
  }

  // 创建控制器
  private initControls(): void {
    if (!this.camera || !this.renderer) {
      throw new Error("camera or renderer is null");
    }
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = this.enabledMouseControl;

    // 环游控制器
    this.cameraAroundControl = new OrbitControls(this.camera, this.renderer.domElement);
    // 设置autoRotate为true，使相机自动旋转
    this.cameraAroundControl.autoRotate = true;
    this.cameraAroundControl.enableRotate = false;
    this.cameraAroundControl.enableZoom = false;
    this.cameraAroundControl.enablePan = false;

    // 飞行控制器（键盘用）
    if (!this.enabledRoamEdit && this.enabledKeyboardControl) {
      this.keyboardControls = new FlyControls(this.camera, this.renderer.domElement);
      if (this.keyboardControls) {
        this.keyboardControls.movementSpeed = 0.01;
        this.keyboardControls.rollSpeed = 0.01;
      }
    }
  }

  // 初始化场景
  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  // 初始化渲染器
  private initRenderer(): void {
    if (!this.container) {
      throw new Error("elementRef is null");
    }

    const { clientWidth, clientHeight } = this.container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.shadowMap.enabled = true;
    // @ts-ignore
    this.renderer.powerPreference = "high-performance";
    // 色调映射
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // // 曝光
    this.renderer.toneMappingExposure = 1;
    // this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // @ts-ignore
    this.renderer.shadowMap.renderSingleSided = true;
    this.container.appendChild(this.renderer.domElement);
    this.initCSS2DRenderer();
  }

  // 初始化css渲染器
  private initCSS2DRenderer(): void {
    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.css2DRenderer.domElement.style.position = "absolute";
    this.css2DRenderer.domElement.style.pointerEvents = "none";
    this.css2DRenderer.domElement.style.top = "0px";
    this.container.appendChild(this.css2DRenderer.domElement);
  }

  private clearNightBulb(): void {
    if (!this.scene) {
      throw new Error("scene is null");
    }
    this.nightBulbLight.forEach((item) => {
      this.scene?.remove(item);
    });
  }

  // 场景中创建灯光
  private createBulbLight(): void {
    if (!this.scene) {
      throw new Error("scene is null");
    }

    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const light = this.createPointLight(center, 0xffa500, 0.5, 20, 2);
    this.scene.add(light);

    const leftLight = this.createPointLight(new THREE.Vector3(center.x + size.x / 4, center.y, center.z), 0xffa500, 0.5, 20, 2);
    this.scene.add(leftLight);

    const rightLight = this.createPointLight(new THREE.Vector3(center.x - size.x / 4, center.y, center.z), 0xffa500, 0.5, 20, 2);
    this.scene.add(rightLight);
  }

  private createPointLight(position: THREE.Vector3, color: number, intensity: number, distance: number, decay: number): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.copy(position);
    light.shadow.mapSize = new THREE.Vector2(4096, 4096);
    this.nightBulbLight.push(light);
    return light;
  }

  // 创建光源
  private createLight(): void {
    // this.initGui()
    if (!this.scene) {
      throw new Error("scene is null");
    }
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    this.directionalLight.position.set(-15, 10, 3); // 角度
    this.directionalLight.target.position.set(0, 0, 0); // 照射目标
    this.directionalLight.castShadow = true; // 产生阴影
    this.directionalLight.shadow.mapSize = new THREE.Vector2(4096, 4096);
    // this.directionalLight.shadow.radius = 3
    this.scene?.add(this.directionalLight);
    // 初始化光源
    this.initDayLight();
  }

  private isMeshType(object?: THREE.Object3D): object is THREE.Mesh {
    return object?.type === "Mesh";
  }

  private handleSceneShadow(): void {
    const reg = /-[^-+]+-[^-+]+-/g;
    this.model.traverse((child) => {
      if (reg.test(child.name)) {
        child.name = child.name.split("_").length > 1 ? child.name.split("_")[1] : child.name.split("_")[0];
        reg.lastIndex = 0;
      }
      // if (child.name.includes('SM_Plants_01')) {
      //   child.visible = false
      // }
      if (this.isMeshType(child) && child.isMesh && !child.name.includes("地坪") && !child.name.includes("地形")) {
        child.castShadow = true;
      }
      if (child.name.includes("地形") || child.name.includes("地坪")) {
        child.receiveShadow = true;
      }
    });
  }

  // 获取动画列表
  private getModelAnimationList(result: GLTF): void {
    this.modelAnimation = result.animations || [];
  }

  private sceneAnimation(): void {
    this.renderAnimation = requestAnimationFrame(() => {
      this.sceneAnimation();
    });
    // 等模型加载和相关数据处理完成在执行
    if (this.loadingStatus && this.scene && this.camera) {
      this.stats && this.stats.update();
      this.renderer && this.renderer.render(this.scene, this.camera);
      if (this.keyboardControls) {
        this.keyboardControls.update();
        this.setCameraControl();
      }
      if (this.cameraAroundControl && this.openTourAround) {
        this.cameraAroundControl.update();
      }
      if (this.rainEffect) {
        this.rainEffect.update();
      }
      if (this.snowEffect) {
        this.snowEffect.update();
      }
      this.css2DRenderer && this.css2DRenderer.render(this.scene, this.camera);
      TWEEN.update();
    }
  }

  // 开始动画
  private onStartModelAnimation(): void {
    const config = {
      animationName: "All Animations",
      loop: "LoopRepeat",
      rotationSpeed: 1,
      rotationType: "y",
      rotationVisible: false,
      timeScale: 1,
      visible: false,
      weight: 1,
    };
    this.onSetModelAnimation(config);
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrameFun();
  }

  // 设置模型动画
  private onSetModelAnimation({
    animationName,
    loop,
    timeScale,
    weight,
  }: {
    animationName: string;
    loop: string;
    timeScale: number;
    weight: number;
  }): void {
    this.animationMixer = new THREE.AnimationMixer(this.model);
    const clip = THREE.AnimationClip.findByName(this.modelAnimation, animationName);
    if (clip) {
      this.animateClipAction = this.animationMixer.clipAction(clip);
      this.animateClipAction.setEffectiveTimeScale(timeScale);
      this.animateClipAction.setEffectiveWeight(weight);
      this.animateClipAction.setLoop(this.loopMap[loop], 10000);
      this.animateClipAction.play();
    }
  }

  // 动画帧
  private animationFrameFun(): void {
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrameFun();
    });
    if (this.animationMixer) {
      this.animationMixer.update(this.animationClock.getDelta());
    }
  }

  // 清除动画
  private onClearAnimation(): void {
    if (!this.animateClipAction) return;
    this.animationMixer.stopAllAction();
    this.animationMixer.update(0);
    cancelAnimationFrame(this.animationFrame as unknown as number);
  }
}
