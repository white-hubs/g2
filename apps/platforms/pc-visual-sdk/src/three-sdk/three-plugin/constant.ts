import { TextureUtil } from "../three-tools/texture";
export const lightConfig = {
  twilightLightConfig: {
    intensity: 0.2,
    sceneBackground: new TextureUtil().skyTwilightTexture,
    sceneEnvironment: new TextureUtil().parkNightEnvironment,
  },
  nightLightConfig: {
    intensity: 0.2,
    sceneBackground: new TextureUtil().skyNightTexture,
    sceneEnvironment: new TextureUtil().parkNightEnvironment,
  },
  dayLightConfig: {
    intensity: 5,
    sceneBackground: new TextureUtil().skyLightTexture,
    sceneEnvironment: new TextureUtil().parkDayEnvironment,
  },
};
