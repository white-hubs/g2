import * as THREE from "three";

/** MinIO 纹理基址（cube-visual-sdk 天空盒等） */
const MINIO_TEXTURE_BASE = "/resource/v1/cube-visual-sdk/texture";
const VIEW_3_IMAGE = "/resource/v1/cube-visual-sdk/three-tools/texture/view-3.png";
const parkDay = [["posx", "negx", "posy", "negy", "posz", "negz"] as const].flatMap((dirs) =>
  dirs.map((d) => `${MINIO_TEXTURE_BASE}/park-day/${d}.jpg`),
);
const parkNight = [["posx", "negx", "posy", "negy", "posz", "negz"] as const].flatMap((dirs) =>
  dirs.map((d) => `${MINIO_TEXTURE_BASE}/park-night/${d}.jpg`),
);
const skyLight = [["posx", "negx", "posy", "negy", "posz", "negz"] as const].flatMap((dirs) =>
  dirs.map((d) => `${MINIO_TEXTURE_BASE}/sky-box/light/${d}.jpg`),
);
const skyTwilight = [["posx", "negx", "posy", "negy", "posz", "negz"] as const].flatMap((dirs) =>
  dirs.map((d) => `${MINIO_TEXTURE_BASE}/sky-box/twilight/${d}.jpg`),
);
const skyNight = [["posx", "negx", "posy", "negy", "posz", "negz"] as const].flatMap((dirs) =>
  dirs.map((d) => `${MINIO_TEXTURE_BASE}/sky-box/night/${d}.jpg`),
);

export class TextureUtil {
  public imgTexture: THREE.Texture;
  public skyLightTexture: THREE.CubeTexture;
  public skyTwilightTexture: THREE.CubeTexture;
  public skyNightTexture: THREE.CubeTexture;
  public parkDayEnvironment: THREE.CubeTexture;
  public parkNightEnvironment: THREE.CubeTexture;
  public constructor() {
    this.imgTexture = new THREE.TextureLoader().load(VIEW_3_IMAGE);

    this.parkDayEnvironment = new THREE.CubeTextureLoader().load(parkDay as [string, string, string, string, string, string]);
    this.parkNightEnvironment = new THREE.CubeTextureLoader().load(parkNight as [string, string, string, string, string, string]);

    this.skyLightTexture = new THREE.CubeTextureLoader().load(skyLight as [string, string, string, string, string, string]);
    this.skyTwilightTexture = new THREE.CubeTextureLoader().load(skyTwilight as [string, string, string, string, string, string]);
    this.skyNightTexture = new THREE.CubeTextureLoader().load(skyNight as [string, string, string, string, string, string]);
  }
}
