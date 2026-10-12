/**
 * 环境预设配置，通过时间+天气的组合 生成不同天空盒、光线、环境光等配置
 */

import {
  Color3,
  Color4,
  CubeTexture,
  type DirectionalLight,
  type HemisphericLight,
  type Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";

import { cubeWeb3DInstance } from "../web-3d";
import { calculateBoundingBox } from "./model-helper";
const rainDrop = "/resource/v1/cube-visual-sdk/textures/effect/rain-drop.png";
const snow = "/resource/v1/cube-visual-sdk/textures/effect/snow.png";

/** 时间枚举 */
export enum TimeEnum {
  DAY = "day",
  DUSK = "dusk",
  NIGHT = "night",
}

/** 天气枚举 */
export enum WeatherEnum {
  SUNNY = "Sunny",
  CLOUDY = "Cloudy",
  RAINY = "Rain",
  SNOWY = "Snow",
  FOG = "Foggy",
}

function getEnvironmentConfig(
  time: TimeEnum,
  weather: WeatherEnum,
): {
  lightConfig: {
    mainLight: {
      direction: Vector3;
      intensity: number;
      color: Color3;
    };
    ambient: {
      intensity: number;
      groundColor: Color3;
    };
    exposure: number;
    darkness: number;
    specular: Color3;
  };
  skyConfig: {
    texturesPath: string;
  };
} {
  // 默认白天
  const lightConfig = {
    mainLight: {
      direction: new Vector3(-1, -2, 1),
      intensity: 1.5,
      color: new Color3(1.0, 0.98, 0.95),
    },
    ambient: {
      intensity: 0.6,
      groundColor: new Color3(0.8, 0.8, 0.8),
    },
    exposure: 0.8,
    darkness: 0.4,
    specular: new Color3(1, 1, 1),
  };
  // 默认晴
  const skyConfig = {
    texturesPath: "/sky-box/day/day",
  };

  if (weather !== WeatherEnum.SUNNY) {
    skyConfig.texturesPath = "/sky-box/cloud/cloud";
  }

  if (time === TimeEnum.DUSK) {
    lightConfig.mainLight = {
      direction: new Vector3(-0.8, -1, 0.5),
      intensity: 0.8,
      color: new Color3(1.0, 0.6, 0.4),
    };
    lightConfig.ambient = {
      intensity: 0.3,
      groundColor: new Color3(0.4, 0.3, 0.2),
    };
    lightConfig.exposure = 0.4;
    lightConfig.darkness = 0.6;
    lightConfig.specular = new Color3(0.8, 0.4, 0.2);
    skyConfig.texturesPath = "/sky-box/dusk/dusk";
  }
  if (time === TimeEnum.NIGHT) {
    lightConfig.mainLight = {
      direction: new Vector3(0, -1, 0),
      intensity: 0.3,
      color: new Color3(0.2, 0.3, 0.8),
    };
    lightConfig.ambient = {
      intensity: 0.1,
      groundColor: new Color3(0.1, 0.1, 0.1),
    };
    lightConfig.exposure = 0.2;
    lightConfig.darkness = 0.8;
    lightConfig.specular = new Color3(0.2, 0.3, 0.8);
    skyConfig.texturesPath = "/sky-box/space2/space";
  }

  return {
    lightConfig,
    skyConfig,
  };
}

/** 创建夜晚的点光源 */
function createNightPointLight(): void {
  const { min, max } = calculateBoundingBox(cubeWeb3DInstance._modelMesh);
  const xLength = Math.abs(max.x - min.x);
  const centerX = (max.x + min.x) / 2;
  const centerY = (max.y + min.y) / 2;
  const centerZ = (max.z + min.z) / 2;
  const light = new PointLight("night-light", new Vector3(centerX, centerY, centerZ), cubeWeb3DInstance._scene);
  light.diffuse = new Color3(1, 0.5, 0); // 橙色漫反射光
  light.specular = new Color3(1, 1, 0); // 黄色高光
  light.intensity = 10000;

  const light2 = light.clone("night-light") as PointLight;
  light2.position.set(centerX + xLength / 3, centerY, centerZ);

  const light3 = light.clone("night-light") as PointLight;
  light3.position.set(centerX - xLength / 3, centerY, centerZ);
}

/** 下雪 */
function snowEffect(): void {
  const scene = cubeWeb3DInstance._scene;
  if (scene.getParticleSystemById("CubeSnowParticles")) {
    return;
  }
  const camera = scene.activeCamera;

  // 如果相机不存在则直接返回
  if (!camera) {
    return;
  }

  // 1. 创建粒子系统
  const particleSystem = new ParticleSystem("CubeSnowParticles", 50000, scene);
  particleSystem.emitRate = 500; // 每秒发射的粒子数量

  // 2. 设置发射器位置为相机上方
  const emitter = camera.position.add(new Vector3(0, 10, 0));
  particleSystem.emitter = emitter;

  // 3. 加载雪花纹理
  particleSystem.particleTexture = new Texture(snow, scene);

  // 4. 关键属性配置
  particleSystem.minSize = 0.1; // 最小粒子尺寸
  particleSystem.maxSize = 0.3; // 最大粒子尺寸
  particleSystem.color1 = new Color4(1, 1, 1, 0.8); // 主颜色
  particleSystem.color2 = new Color4(1, 1, 1, 0.5); // 次颜色
  particleSystem.minLifeTime = 5; // 最小生命周期（秒）
  particleSystem.maxLifeTime = 10; // 最大生命周期（秒）

  // 5. 添加重力效果
  particleSystem.gravity = new Vector3(0, -2, 0);

  // 6. 设置发射区域
  particleSystem.minEmitBox = new Vector3(-50, 0, -50);
  particleSystem.maxEmitBox = new Vector3(50, 0, 50);

  // 7. 设置粒子方向，添加水平方向的随机偏移
  particleSystem.direction1 = new Vector3(-0.5, -1, -0.5);
  particleSystem.direction2 = new Vector3(0.5, -1, 0.5);

  // 8. 设置粒子速度
  particleSystem.minEmitPower = 0.5;
  particleSystem.maxEmitPower = 2;

  // 9. 启动粒子系统
  particleSystem.start();

  // 10. 注册渲染前回调，使发射器跟随相机
  scene.onBeforeRenderObservable.add(() => {
    if (camera) {
      particleSystem.emitter = camera.position.add(new Vector3(0, 10, 0));
    }
  });
}

/** 下雨 */
function rainEffect(): void {
  const scene = cubeWeb3DInstance._scene;
  if (scene.getParticleSystemById("CubeRainParticles")) {
    return;
  }

  const camera = scene.activeCamera;

  // 如果相机不存在则直接返回
  if (!camera) {
    return;
  }

  // 1. 创建粒子系统
  const particleSystem = new ParticleSystem("CubeRainParticles", 50000, scene);
  particleSystem.emitRate = 1000; // 每秒发射的粒子数量

  // 2. 设置发射器位置为相机上方
  const emitter = camera.position.add(new Vector3(0, 10, 0));
  particleSystem.emitter = emitter;

  // 3. 加载粒子纹理（必须设置）
  particleSystem.particleTexture = new Texture(rainDrop, scene);

  // 4. 关键属性配置
  particleSystem.minSize = 0.05; // 最小粒子尺寸
  particleSystem.maxSize = 0.15; // 最大粒子尺寸
  particleSystem.color1 = new Color4(0.8, 0.8, 1, 0.8); // 主颜色
  particleSystem.color2 = new Color4(1, 1, 1, 0.5); // 次颜色
  particleSystem.minLifeTime = 2; // 最小生命周期（秒）
  particleSystem.maxLifeTime = 5; // 最大生命周期（秒）

  // 5. 添加重力效果
  particleSystem.gravity = new Vector3(0, -9.81, 0);

  // 6. 设置发射区域
  particleSystem.minEmitBox = new Vector3(-50, 0, -50);
  particleSystem.maxEmitBox = new Vector3(50, 0, 50);

  // 7. 设置粒子方向为垂直向下
  particleSystem.direction1 = new Vector3(0, -1, 0);
  particleSystem.direction2 = new Vector3(0, -1, 0);

  // 8. 设置粒子速度
  particleSystem.minEmitPower = 1;
  particleSystem.maxEmitPower = 100;

  // 9. 启动粒子系统
  particleSystem.start();

  // 10. 注册渲染前回调，使发射器跟随相机
  scene.onBeforeRenderObservable.add(() => {
    if (camera) {
      particleSystem.emitter = camera.position.add(new Vector3(0, 10, 0));
    }
  });
}

export function changeEnvironment(time: TimeEnum, weather: WeatherEnum): void {
  const scene = cubeWeb3DInstance._scene;
  // 遍历场景中的所有光源 去除夜晚的灯光
  for (let i = scene.lights.length - 1; i >= 0; i--) {
    const light = scene.lights[i];
    light.name === "night-light" && light.dispose();
  }
  const config = getEnvironmentConfig(time, weather);

  // 更新主光源
  const mainLight = scene.lights.find((e) => e.name === "CubeMainLight") as DirectionalLight;
  mainLight.direction = config.lightConfig.mainLight.direction;
  mainLight.intensity = config.lightConfig.mainLight.intensity;
  mainLight.diffuse = config.lightConfig.mainLight.color;
  mainLight.specular = config.lightConfig.specular;

  // 更新环境光
  const ambientLight = scene.lights.find((e) => e.name === "CubeAmbientLight") as HemisphericLight;
  ambientLight.intensity = config.lightConfig.ambient.intensity;
  ambientLight.groundColor = config.lightConfig.ambient.groundColor;

  // 更新曝光
  scene.imageProcessingConfiguration.exposure = config.lightConfig.exposure;

  // 阴影
  const shadowGenerator = cubeWeb3DInstance._shadowGenerator;
  shadowGenerator.setDarkness(config.lightConfig.darkness);

  let skyBox = scene.getNodeByName("CubeSkyBox") as Mesh;
  if (!skyBox) {
    skyBox = MeshBuilder.CreateBox("CubeSkyBox", { size: 10000 }, scene);
  }
  const skyboxMaterial = new StandardMaterial("skyMat", scene);
  skyboxMaterial.reflectionTexture = new CubeTexture(cubeWeb3DInstance._texturesPath + config.skyConfig.texturesPath, scene);
  skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.disableLighting = true;
  skyboxMaterial.fogEnabled = false;
  skyBox.material = skyboxMaterial;
  skyBox.infiniteDistance = true;

  // 夜晚灯光
  if (time === TimeEnum.NIGHT) {
    mainLight.setEnabled(false);
    createNightPointLight();
    mainLight.setEnabled(true);
  }

  // 雾效
  if (weather === WeatherEnum.FOG) {
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogDensity = 0.1;
    scene.fogColor = new Color3(0.8, 0.8, 0.8);

    const skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture(cubeWeb3DInstance._texturesPath + config.skyConfig.texturesPath, scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skyBox.material = skyboxMaterial;
  } else {
    scene.fogMode = Scene.FOGMODE_NONE;
  }

  if (weather === WeatherEnum.RAINY) {
    rainEffect();
  } else {
    scene.getParticleSystemById("CubeRainParticles")?.stop();
    scene.getParticleSystemById("CubeRainParticles")?.particleTexture?.dispose();
    scene.particleSystems = scene.particleSystems.filter((ps) => ps.name !== "CubeRainParticles");
  }

  if (weather === WeatherEnum.SNOWY) {
    snowEffect();
  } else {
    scene.getParticleSystemById("CubeSnowParticles")?.stop();
    scene.getParticleSystemById("CubeSnowParticles")?.particleTexture?.dispose();
    scene.particleSystems = scene.particleSystems.filter((ps) => ps.name !== "CubeSnowParticles");
  }
}
