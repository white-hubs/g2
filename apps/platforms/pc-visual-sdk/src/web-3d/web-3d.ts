import "@babylonjs/loaders";
import {
  type AbstractMesh,
  type ArcRotateCamera,
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  LoadAssetContainerAsync,
  Mesh,
  MeshBuilder,
  type Node,
  type Nullable,
  Ray,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  type TransformNode,
  Vector3,
  WebGPUEngine,
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Container } from "@babylonjs/gui/2D/controls/container";
import gsap from "gsap";
import mitt from "mitt";

import { createCamera, handleBuildingIconPlane } from "./tools/camera-helper";
import { changeEnvironment, TimeEnum, WeatherEnum } from "./tools/environment-helper";
import { registerGUIPanel } from "./tools/gui-panel-helper";
import { iconLabelHelper } from "./tools/icon-label-helper";
import { loadingHelper } from "./tools/loading-container";
import {
  calculateBoundingBox,
  createMaterialByTexture,
  startRotateAroundCameraTarget,
  stopRotateAroundCameraTarget,
} from "./tools/model-helper";

interface NodeTree {
  id: string;
  name: string;
  type: string;
  children?: NodeTree[];
}

/** 视角参数 */
export interface ViewAngleParameter {
  target: {
    x: number;
    y: number;
    z: number;
  };
  alpha: number;
  beta: number;
  radius: number;
}

interface IconLabelClickEvent {
  type: "BUILD_ICON" | "DEVICE_ICON";
  props: Record<string, unknown>;
}
// 在类顶部添加类型声明
export interface CubeWeb3DEvents {
  "icon-label-click": IconLabelClickEvent;
  [key: string | symbol]: unknown;
}

class CubeWeb3D {
  private engine: WebGPUEngine | Engine | undefined;
  private scene: Scene | undefined;
  private camera: ArcRotateCamera | undefined;
  private shadowGenerator?: ShadowGenerator; // 新增阴影生成器引用
  private modelMesh: AbstractMesh[] = [];
  private modelTime: TimeEnum = TimeEnum.DAY;
  private modelWeather: WeatherEnum = WeatherEnum.SUNNY;
  private texturesPath: string;
  private readonly eventBus = mitt<CubeWeb3DEvents>();
  private defaultViewAngleParameter: ViewAngleParameter = {
    target: {
      x: 0,
      y: 0,
      z: 0,
    },
    alpha: 0,
    beta: 0,
    radius: 0,
  };
  /** 楼栋标签管理对象 */
  private readonly buildLabelMap = new Map<
    string,
    {
      container: Container;
      advancedTexture: AdvancedDynamicTexture;
      plane: Mesh;
    }
  >();
  /** 设备标签管理对象 */
  private readonly deviceLabelMap = new Map<
    string,
    {
      container: Container;
      advancedTexture: AdvancedDynamicTexture;
      plane: Mesh;
    }
  >();
  /** 隐藏楼层管理对象 */
  private readonly hiddenFloorMap = new Map<string, Node>();

  public get _texturesPath(): string {
    return this.texturesPath;
  }

  public get _scene(): Scene {
    if (!this.scene) {
      throw new Error("scene is not init");
    }
    return this.scene;
  }

  public get _shadowGenerator(): ShadowGenerator {
    if (!this.shadowGenerator) {
      throw new Error("shadowGenerator is not init");
    }
    return this.shadowGenerator;
  }

  public get _modelTime(): TimeEnum {
    return this.modelTime;
  }

  public set _modelTime(value: TimeEnum) {
    this.modelTime = value;
    changeEnvironment(this.modelTime, this.modelWeather);
  }

  public get _modelWeather(): WeatherEnum {
    return this.modelWeather;
  }

  public set _modelWeather(value: WeatherEnum) {
    this.modelWeather = value;
    changeEnvironment(this.modelTime, this.modelWeather);
  }

  public get _modelMesh(): AbstractMesh[] {
    return this.modelMesh;
  }

  public get _buildingIconPlaneList(): Mesh[] {
    // 从buildLabelMap获取
    return Array.from(this.buildLabelMap.values()).map(({ plane }) => plane);
  }
  public get _deviceIconPlaneList(): Mesh[] {
    // 从buildLabelMap获取
    return Array.from(this.deviceLabelMap.values()).map(({ plane }) => plane);
  }

  public get _defaultViewAngleParameter(): ViewAngleParameter {
    return this.defaultViewAngleParameter;
  }

  public constructor(options?: { texturesPath?: string }) {
    this.texturesPath = options?.texturesPath ?? "/textures";
  }

  /** 设置 texturesPath */
  public setTexturesPath(texturesPath: string): void {
    this.texturesPath = texturesPath;
  }

  /** 初始化场景 */
  public async initScene(canvas: HTMLCanvasElement): Promise<void> {
    try {
      loadingHelper.initLogoLoadingContainer();
      loadingHelper.setProgressText("场景初始化中...");
      let supported = await WebGPUEngine.IsSupportedAsync;

      if (supported) {
        this.engine = new WebGPUEngine(canvas, {
          stencil: true,
        });
        // 增加WebGPU引擎异步初始化
        await this.engine.initAsync();
      } else {
        this.engine = new Engine(canvas, true, {
          preserveDrawingBuffer: true,
          stencil: true,
        });
      }
      this.scene = new Scene(this.engine);
      this.camera = createCamera(this.scene);
      this.camera.attachControl(canvas, true);

      // 初始化主光源
      const mainLight = new DirectionalLight("CubeMainLight", new Vector3(-1, -2, 1), this.scene);

      // 初始化环境光
      new HemisphericLight("CubeAmbientLight", new Vector3(0, 1, 0), this.scene);

      // 初始化阴影
      this.shadowGenerator = new ShadowGenerator(2048, mainLight);
      this.shadowGenerator.useBlurCloseExponentialShadowMap = true;

      // 应用默认白天配置
      changeEnvironment(this.modelTime, this.modelWeather);

      this.scene.imageProcessingConfiguration.contrast = 1.1;
      this.scene.imageProcessingConfiguration.toneMappingEnabled = true;

      registerGUIPanel();

      this.engine.runRenderLoop(() => {
        this.scene?.render();
      });
      window.addEventListener("resize", () => {
        this.engine?.resize();
      });

      window.addEventListener("beforeunload", () => {
        this.engine?.dispose();
      });

      // 设备标签纹理预加载
      await iconLabelHelper.loadingDeviceIconTexture();
    } catch (error) {}
  }

  /**
   * 加载3D模型
   * @param scene 场景对象
   * @param modelUrl 模型文件URL
   * @returns Promise<AbstractMesh> 加载的模型网格
   */
  public async loadModel(modelUrl: string | File): Promise<void> {
    if (!this.scene || !this.camera) {
      throw new Error("Scene or camera not initialized");
    }

    loadingHelper.initLogoLoadingContainer();
    const assetContainer = await LoadAssetContainerAsync(modelUrl, this.scene, {
      pluginOptions: {
        gltf: {
          skipMaterials: false,
          extensionOptions: {
            MSFT_lod: {
              maxLODsToLoad: 1,
            },
          },
        },
      },
      onProgress: (event) => {
        if (event.lengthComputable) {
          const progressPercent = ((event.loaded / event.total) * 100).toFixed(2);
          loadingHelper.setProgressText(`${progressPercent}%`);
          if (progressPercent === "100.00") {
            loadingHelper.setProgressText("渲染中...");
          }
        }
      },
    });
    assetContainer.addAllToScene();
    const rootNode = this.scene.getMeshByName("__root__");
    if (rootNode) {
      rootNode.name = "CubeMainModel";
    }

    const meshes = assetContainer.meshes.filter((m) => m.isEnabled());
    const { min, max } = calculateBoundingBox(meshes);
    this.camera.setTarget(new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2));
    // 计算包围盒对角向量
    const diagonal = max.subtract(min);

    // 计算半径（对角线长度的一半）
    const radius = diagonal.length() / 2;

    // 使用方式（例如设置相机距离）：
    this.camera.radius = radius * 1.5;
    this.camera.upperRadiusLimit = radius * 1.5;
    this.defaultViewAngleParameter = {
      target: {
        x: this.camera.target.x,
        y: this.camera.target.y,
        z: this.camera.target.z,
      },
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
    };
    assetContainer.meshes.forEach((mesh) => {
      mesh.receiveShadows = true;
      if (mesh instanceof Mesh && this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(mesh);
      }
    });
    this.modelMesh = meshes;

    return new Promise((resolve) => {
      this.scene?.onAfterRenderObservable.add(() => {
        if (assetContainer.meshes.every((mesh) => mesh.isReady())) {
          this.scene?.onAfterRenderObservable.clear();
          loadingHelper.clear();
          resolve();
        }
      });
    });
  }

  /** 移动相机到指定位置和姿势 */
  public async flyTo(options: ViewAngleParameter): Promise<void> {
    const duration = 1;
    if (!this.camera) {
      return;
    }
    const cameraAnim = gsap.to(this.camera, {
      alpha: options.alpha, // 目标水平角度（弧度）
      beta: options.beta, // 目标垂直角度（弧度）
      radius: options.radius, // 目标距离
      duration, // 动画时长
      ease: "power2.inOut", // 缓动曲线
    });
    const targetPosition = {
      x: this.camera.target.x,
      y: this.camera.target.y,
      z: this.camera.target.z,
    };
    gsap.to(targetPosition, {
      x: options.target.x,
      y: options.target.y,
      z: options.target.z,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera?.target.set(targetPosition.x, targetPosition.y, targetPosition.z);
      },
    });
    cameraAnim.play();
    return new Promise((resolve) => {
      cameraAnim.eventCallback("onComplete", () => {
        resolve();
      });
    });
  }

  /** 环游开启、关闭 */
  public toggleRotateAroundCameraTarget(status: boolean): void {
    if (!this.scene) {
      throw new Error("Scene not initialized");
    }
    status ? startRotateAroundCameraTarget() : stopRotateAroundCameraTarget();
  }

  /** 建筑标签 */
  public async addBuildingLabels(labels: { nodeId: string; text: string; props: Record<string, unknown> }[]): Promise<void> {
    if (!this.scene) {
      throw new Error("Scene not initialized");
    }
    for (const element of labels) {
      const findNode = this.scene.getNodeById(element.nodeId) as TransformNode;
      if (findNode) {
        // 判断Map中是否已经存在该nodeId的标签
        if (this.buildLabelMap.has(element.nodeId)) {
          const { container, plane } = this.buildLabelMap.get(element.nodeId)!;
          container.isVisible = true;
          plane.isVisible = true;
          continue;
        }

        const { width, height, base64 } = await iconLabelHelper.generateBuildingLabelBase64(element.text);
        const plane = MeshBuilder.CreatePlane(
          "CubeBuildingIconPanel_" + element.text,
          { width: width / 10, height: height / 10 },
          this.scene,
        );
        const texture = new Texture(base64, this.scene);
        texture.uScale = -1;
        texture.hasAlpha = true; // 启用透明通道
        texture.name = "label-icon-" + element.nodeId;
        texture.onLoadObservable.add(() => {
          const mat2 = new StandardMaterial("label-icon", this.scene);
          mat2.diffuseTexture = texture;
          mat2.emissiveColor = new Color3(1, 1, 1);
          mat2.disableLighting = false; // 保持光照影响
          mat2.backFaceCulling = false; // 关闭背面剔除
          mat2.alpha = 1;
          mat2.specularColor = new Color3(0, 0, 0);
          mat2.useAlphaFromDiffuseTexture = true; // 使用纹理alpha通道
          plane.material?.dispose();
          plane.material = mat2;
        });

        // 递归获取所有子网格的包围盒极值
        const boundingVectors = findNode.getHierarchyBoundingVectors(true);
        const min = boundingVectors.min;
        const max = boundingVectors.max;

        // 计算标签的大概位置
        const centerWorld = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2 + ((max.y - min.y) / 2) * 1.4, (min.z + max.z) / 2);
        plane.position = centerWorld;
        const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024);
        const container = new Container();
        container.width = "100%";
        container.height = "100%";
        advancedTexture.addControl(container);
        container.onPointerClickObservable.add(() => {
          this.eventBus.emit("icon-label-click", { type: "BUILD_ICON", props: element.props });
        });
        // 存储到管理对象
        this.buildLabelMap.set(element.nodeId, {
          container,
          advancedTexture,
          plane,
        });
        handleBuildingIconPlane();
      }
    }
  }

  /** 设备标签 */
  public async addDeviceLabels(
    labels: {
      nodeName: string;
      type: "SUCCESS" | "ERROR";
      props: { deviceId: string; deviceCode: string; prodCategoryName: string };
    }[],
  ): Promise<void> {
    if (!this.scene) {
      throw new Error("Scene not initialized");
    }
    // 平面创建
    let existingPlane = this.scene.getMeshByName("CubeDeviceIconPanel");
    if (!existingPlane) {
      existingPlane = MeshBuilder.CreatePlane("CubeDeviceIconPanel", { width: 4, height: 4 }, this.scene);
      existingPlane.renderingGroupId = 1;
      existingPlane.isVisible = false;
    }

    for await (const element of labels) {
      const findNode = this.getNodeByName(element.nodeName, true) as TransformNode;
      // 纹理名称
      const textureName = `device-icon-${element.type.toLocaleLowerCase()}-${element.props.prodCategoryName}`;
      let texture = this.scene.getTextureByName(textureName) as Texture;
      if (!texture) {
        // 纹理不存在则创建纹理
        texture = new Texture(
          iconLabelHelper.getDeviceIconBase64(element.props.prodCategoryName, element.type.toLocaleLowerCase()),
          this.scene,
        );
        texture.hasAlpha = true;
        texture.name = textureName;
        texture.uScale = -1;
      }

      if (findNode) {
        if (this.deviceLabelMap.has(element.nodeName)) {
          const { container, plane } = this.deviceLabelMap.get(element.nodeName) as NonNullable<ReturnType<typeof this.deviceLabelMap.get>>;
          container.isVisible = true;
          plane.isVisible = true;
          plane.material = await createMaterialByTexture(texture);
          continue;
        }
        const plane = existingPlane.clone("CubeDeviceIconPanel" + element.nodeName + "_clone", null) as Mesh;
        plane.isVisible = true;
        const boundingVectors = findNode.getHierarchyBoundingVectors(true);
        const min = boundingVectors.min;
        const max = boundingVectors.max;
        const centerWorld = new Vector3(
          (min.x + max.x) / 2,
          Math.max(0, (min.y + max.y) / 2) + ((max.y - min.y) / 2) * 1.2, // 确保Y轴不小于0
          (min.z + max.z) / 2,
        );
        plane.position = centerWorld;
        plane.renderingGroupId = 1;
        plane.lookAt(this.camera?.position || Vector3.Zero());
        const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024);
        plane.material?.dispose(); // 释放AdvancedDynamicTexture产生的材质
        plane.material = await createMaterialByTexture(texture);
        const container = new Container();
        container.width = "100%";
        container.height = "100%";
        advancedTexture.addControl(container);

        container.onPointerClickObservable.add(() => {
          this.eventBus.emit("icon-label-click", { type: "DEVICE_ICON", props: element.props });
        });

        this.deviceLabelMap.set(element.nodeName, {
          container,
          advancedTexture,
          plane,
        });
      }
    }
  }

  public onIconLabelClick(callback: (eventParams: IconLabelClickEvent) => void): void {
    this.eventBus.on("icon-label-click", (event) => {
      callback(event);
    });
  }

  /**
   * 删除标签
   */
  public removeLabels(type: "ALL" | "DEVICE" | "BUILDING"): void {
    if (type === "ALL" || type === "BUILDING") {
      this.buildLabelMap.forEach(({ container, plane }) => {
        // 隐藏容器
        container.isVisible = false;
        // 隐藏关联的平面网格
        plane.isVisible = false;
      });
    }
    if (type === "ALL" || type === "DEVICE") {
      this.deviceLabelMap.forEach(({ container, plane }) => {
        // 隐藏容器
        container.isVisible = false;
        // 隐藏关联的平面网格
        plane.isVisible = false;
      });
    }
  }

  /** 获取节点树 */
  public getNodeTree(): NodeTree {
    const rootNode = this.scene?.getMeshByName("CubeMainModel");
    if (!rootNode) {
      throw new Error("Root node not found");
    }
    const traverseNode = (node: AbstractMesh): NodeTree => {
      const children = node.getChildren().map((child) => traverseNode(child as AbstractMesh));
      return {
        name: node.name,
        type: node.getClassName(),
        id: node.id,
        children: children.length > 0 ? children : undefined,
      };
    };
    return traverseNode(rootNode);
  }

  /** 通过id设置node enable */
  public setNodeEnableById(id: string, enable?: boolean): void {
    const node = this.scene?.getNodeById(id);
    if (node) {
      node.setEnabled(enable ? enable : !node.isEnabled());
    }
    throw new Error("Node not found");
  }

  /**
   * 通过 name 查找node
   * @param name 节点 name
   * @param fuzzy 是否模糊查找，默认false
   */
  public getNodeByName(name: string, fuzzy?: boolean): Node | Nullable<Node> | undefined {
    if (fuzzy) {
      const nodes = this.scene?.getNodes().toReversed();
      if (nodes) {
        return nodes.find((node) => node.name.includes(name));
      }
    }
    return this.scene?.getNodeByName(name);
  }

  /**
   * 通过id查找node
   * @param id 节点 id
   */
  public getNodeById(id: string): Node | Nullable<Node> | undefined {
    return this.scene?.getNodeById(id);
  }

  /**
   * 通过节点 id 使其包围盒闪烁特效
   * @param id 节点 id
   * @param duration 持续时间，默认 500ms
   * @param color 颜色，默认红色
   */
  public async flashBoundingBoxById(id: string, duration?: number, color?: Color3): Promise<void> {
    const node = this.scene?.getNodeById(id);
    if (node) {
      const boundingBox = node.getHierarchyBoundingVectors(true);
      const min = boundingBox.min;
      const max = boundingBox.max;
      const width = (max.x - min.x) * 1.2;
      const height = (max.y - min.y) * 1.2;
      const depth = (max.z - min.z) * 1.2;
      const box = MeshBuilder.CreateBox("flashBox", { width, height, depth }, this.scene);
      box.position = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);

      // 使用更深的墨绿色 (RGB: 0.3, 0.5, 0.3)
      const material = new StandardMaterial("flashMaterial", this.scene);
      material.emissiveColor = color ? color : new Color3(0.3, 0.5, 0.3);
      material.diffuseColor = color ? color : new Color3(0.3, 0.5, 0.3);
      material.specularColor = new Color3(0, 0, 0);
      material.alpha = 0.6;
      material.backFaceCulling = false;
      box.material = material;

      duration = duration ? duration : 500;
      // 闪烁动画
      const animation = gsap.to(material, {
        alpha: 0,
        duration: duration / 1000,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          box.dispose();
        },
      });
      animation.play();
    }
  }

  /**
   * 通过节点 id 使相机聚焦到该节点合适的位置
   * @param id 节点 id
   */
  public async focusCameraOnNodeById(id: string): Promise<void> {
    const node = this.scene?.getNodeById(id);
    if (node && this.camera) {
      const boundingBox = node.getHierarchyBoundingVectors(true);
      const min = boundingBox.min;
      const max = boundingBox.max;
      const center = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);

      // 定义四个主要方向向量（排除上下方向）
      const directions = [Vector3.Left(), Vector3.Right(), Vector3.Forward(), Vector3.Backward()];

      // 计算各方向最佳距离
      let bestDirection = Vector3.Forward();
      let maxDistance = 0;
      const baseSize = max.subtract(min).length();

      directions.forEach((dir) => {
        // 计算射线起点（从中心偏移两个基础尺寸）
        const rayOrigin = center.add(dir.scale(baseSize * 2));
        const ray = new Ray(
          rayOrigin,
          center.subtract(rayOrigin).normalize(),
          baseSize * 10, // 射线长度
        );

        const hit = this.scene?.pickWithRay(ray, (mesh) => mesh !== node);
        const validDistance = hit?.hit ? hit.distance : ray.length;

        if (validDistance > maxDistance) {
          maxDistance = validDistance;
          bestDirection = dir;
        }
      });

      // 动态距离计算（基于射线检测结果）
      const minDistance = Math.max(2, baseSize);
      const safeDistance = Math.max(minDistance, Math.min(maxDistance * 0.8, baseSize * 5));

      // 计算最终相机位置
      const cameraPosition = center.add(bestDirection.scale(safeDistance));
      const viewDirection = center.subtract(cameraPosition).normalize();

      // // 设置相机参数
      // this.camera.upperRadiusLimit = safeDistance * 2
      // this.camera.lowerRadiusLimit = safeDistance * 0.5

      await this.flyTo({
        target: {
          x: center.x,
          y: center.y,
          z: center.z,
        },
        alpha: Math.atan2(viewDirection.x, viewDirection.z),
        beta: Math.acos(viewDirection.y),
        radius: safeDistance,
      });
      this.flashBoundingBoxById(id);
    }
    return Promise.reject("Node not found");
  }

  /**
   * 显示楼栋，揭开楼层
   */
  public showBuildingFloor(floorName: string): void {
    // 查找楼栋节点
    const floorNode = this.scene?.getNodeById(floorName);

    // 把当前floorNode 比它高的节点隐藏
    if (floorNode && floorNode.parent) {
      floorNode.parent.setEnabled(true);
      // 当前node 的 中心点
      const boundingBox = floorNode.getHierarchyBoundingVectors(true);
      const min = boundingBox.min;
      const max = boundingBox.max;
      const center = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
      floorNode.parent?.getChildren().forEach((child) => {
        if (child.id !== floorName) {
          // 比较其他节点的中心点与当前节点中心点的y坐标
          const childBoundingBox = child.getHierarchyBoundingVectors(true);
          const childMin = childBoundingBox.min;
          const childMax = childBoundingBox.max;
          const childCenter = new Vector3((childMin.x + childMax.x) / 2, (childMin.y + childMax.y) / 2, (childMin.z + childMax.z) / 2);
          child.setEnabled(childCenter.y <= center.y);
          if (childCenter.y > center.y) {
            if (!this.hiddenFloorMap.has(child.id)) {
              this.hiddenFloorMap.set(child.id, child);
            }
          } else {
            if (this.hiddenFloorMap.has(child.id)) {
              this.hiddenFloorMap.delete(child.id);
            }
          }
        }
      });
    }
  }

  /**
   * 显示楼栋，恢复楼层
   */
  public showBuilding(buildingName: string): void {
    // 查找楼栋节点
    const buildingNode = this.scene?.getNodeById(buildingName);
    if (buildingNode) {
      buildingNode.setEnabled(true);
      buildingNode.getChildren().forEach((child) => {
        child.setEnabled(true);
        if (this.hiddenFloorMap.has(child.id)) {
          this.hiddenFloorMap.delete(child.id);
        }
      });
    }
  }

  /** 重置模型 */
  public resetModel(): void {
    // 隐藏所有标签
    this.removeLabels("ALL");
    // 恢复所有楼层
    this.hiddenFloorMap.forEach((child) => {
      child.setEnabled(true);
    });
    this.hiddenFloorMap.clear();
    // 停止环游状态
    this.toggleRotateAroundCameraTarget(false);
    // （TODO）停止漫游状态
  }
}

export const cubeWeb3DInstance = new CubeWeb3D();
