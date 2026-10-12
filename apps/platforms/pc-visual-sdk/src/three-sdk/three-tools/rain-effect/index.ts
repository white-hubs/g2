import * as THREE from "three";
import { PointsMaterial, TextureLoader } from "three";
const rainPng = "/resource/v1/cube-visual-sdk/three-tools/rain-effect/rain-drop.png";
export default class RainEffect {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly rainCount: number;
  private readonly rainGeometry: THREE.BufferGeometry;
  private readonly rainVertices: number[];
  private rain!: THREE.Points;

  public constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.rainCount = 10000;
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainVertices = [];
    this.createRain();
  }

  public update(): void {
    this.animateRain();
  }

  public removeRain(): void {
    this.scene.remove(this.rain);
  }

  private createRain(): void {
    for (let i = 0; i < this.rainCount; i++) {
      const x = (Math.random() - 0.5) * 10000;
      const y = Math.random() * 5000;
      const z = (Math.random() - 0.5) * 10000;
      this.rainVertices.push(x, y, z);
    }

    this.rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.rainVertices, 3));
    const texture = new TextureLoader().load(rainPng);
    const material = new PointsMaterial({
      size: 4,
      // color: 0xaaaaaa,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthTest: false,
    });

    this.rain = new THREE.Points(this.rainGeometry, material);
    this.scene.add(this.rain);
  }

  private animateRain(): void {
    this.rain.geometry.attributes.position.array.forEach((_, i) => {
      this.rain.geometry.attributes.position.array[i * 3 + 1] -= 20;
      if (this.rain.geometry.attributes.position.array[i * 3 + 1] < -400) {
        this.rain.geometry.attributes.position.array[i * 3 + 1] = 500;
      }
    });

    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
