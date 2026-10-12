import * as THREE from "three";
import { PointsMaterial, TextureLoader } from "three";
const snowPng = "/resource/v1/cube-visual-sdk/three-tools/snow-effect/snow.png";
export default class SnowEffect {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly snowCount: number;
  private readonly snowGeometry: THREE.BufferGeometry;
  private readonly snowVertices: number[];
  private rain!: THREE.Points;

  public constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.snowCount = 10000;
    this.snowGeometry = new THREE.BufferGeometry();
    this.snowVertices = [];
    this.createSnow();
  }

  public update(): void {
    this.animateSnow();
  }

  public removeSnow(): void {
    this.scene.remove(this.rain);
  }

  private createSnow(): void {
    for (let i = 0; i < this.snowCount; i++) {
      const x = (Math.random() - 0.5) * 10000;
      const y = Math.random() * 5000;
      const z = (Math.random() - 0.5) * 10000;
      this.snowVertices.push(x, y, z);
    }

    this.snowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.snowVertices, 3));
    const texture = new TextureLoader().load(snowPng);
    const material = new PointsMaterial({
      size: 8,
      color: 0xffffff,
      map: texture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthTest: false,
    });

    this.rain = new THREE.Points(this.snowGeometry, material);
    this.scene.add(this.rain);
  }

  private animateSnow(): void {
    this.rain.geometry.attributes.position.array.forEach((_, i) => {
      this.rain.geometry.attributes.position.array[i * 3 + 1] -= 20;
      if (this.rain.geometry.attributes.position.array[i * 3 + 1] < -400) {
        this.rain.geometry.attributes.position.array[i * 3 + 1] = 500;
      }
    });

    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
