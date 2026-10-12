import * as THREE from "three";
/*
平行光及半球光环境光
*/
export class SunAmbientLight {
  /** 太阳平行光  */
  public sunLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 5);
  /* 环境光 */
  public ambientLight: THREE.HemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 5);
  public constructor() {
    this.initSunLight();
    this.initAmbientLight();
  }

  // 模拟太阳平行光
  private initSunLight(): void {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 5);
    this.sunLight.position.set(1, 1, 1); // 角度
    this.sunLight.position.multiplyScalar(10000); // 距离
    this.sunLight.target.position.set(0, 0, -10); // 照射目标
    this.sunLight.castShadow = true; // 产生阴影
    this.sunLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    this.sunLight.shadow.radius = 3;
    this.sunLight.shadow.camera.near = 10; // 产生阴影的最近距离
    this.sunLight.shadow.camera.far = 100000; // 产生阴影的最远距离
    this.sunLight.shadow.camera.left = -5000; // 产生阴影距离位置的最左边位置
    this.sunLight.shadow.camera.bottom = -5000; // 最下面
    this.sunLight.shadow.camera.right = 5000; // 最右边
    this.sunLight.shadow.camera.top = 5000; // 最上边
  }

  private initAmbientLight(): void {
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
    this.ambientLight.position.set(0, 0, 1);
    this.ambientLight.castShadow = true;
    this.ambientLight.position.multiplyScalar(10000);
  }
}
