import { loadingHelper } from "./loading-container";

const CUBE_VISUAL_SDK_BASE = "/resource/v1/cube-visual-sdk";

const BUILD_LABEL_ICON_BG = `${CUBE_VISUAL_SDK_BASE}/assets/icon/building-label-bg.png`;
const BUILD_LABEL_ICON = `${CUBE_VISUAL_SDK_BASE}/assets/icon/building-label-icon.png`;
const BUILD_BOTTOM = `${CUBE_VISUAL_SDK_BASE}/assets/icon/building-bottom.png`;
const IMG_BORDER = `${CUBE_VISUAL_SDK_BASE}/textures/device-icon-shape/border-drop.png`;
const IMG_BG = `${CUBE_VISUAL_SDK_BASE}/textures/device-icon-shape/bg-round.png`;

function deviceIconUrl(n: number): string {
  return `${CUBE_VISUAL_SDK_BASE}/textures/device-icon/${n}.png`;
}

const deviceIconShapeMap: Record<number, string> = Object.fromEntries(
  Array.from({ length: 101 }, (_, i) => [i + 1, deviceIconUrl(i + 1)]),
) as Record<number, string>;

export const DeviceIconMap: Record<string, number> = {
  视频监控: 1,
  "NVR/DVR": 1,
  高清枪式摄像机: 1,
  摄像机: 1,
  高清球式摄像机: 1,
  高清半球摄像机: 2,
  球机B: 3,
  消火栓: 4,
  消防栓: 4,
  电气: 5,
  电力与变配电: 5,
  电力监测点: 5,
  变压器及温控: 5,
  功率补偿柜: 5,
  照明: 6,
  照明系统: 6,
  控制设备: 6,
  空调: 7,
  通风与空调: 7,
  "大型空调/环境冷热源": 7,
  排风: 8,
  通风设备: 8,
  排水: 9,
  机房: 10,
  备用动力设备: 10,
  发电机组: 10,
  广播: 11,
  环境广播: 11,
  "扬声器/扬声器回路": 11,
  功放: 11,
  门禁: 12,
  防火卷帘门: 12,
  人员通行: 12,
  密码门禁: 12,
  电梯: 13,
  电梯与控制系统: 13,
  梯控设备: 13,
  "自动扶梯、人行道": 13,
  曳引式电梯: 13,
  液压电梯: 13,
  UPS: 14,
  温湿度: 15,
  氧气瓶: 15,
  通用传感器: 15,
  "水浸/漏水": 15,
  空气质量: 15,
  烟感: 16,
  感烟探测器: 16,
  可燃物探测器: 16,
  电表箱: 17,
  能源监测: 17,
  "冷/热能表": 17,
  气表: 17,
  电表: 17,
  水表: 17,
  床头分机: 18,
  灯带: 19,
  照明回路: 19,
  电子显示屏: 20,
  信息显示: 20,
  电子信息显示机柜: 20,
  显示屏: 20,
  分诊排号系统: 20,
  呼吸机: 20,
  医疗设备: 20,
  流量计: 21,
  气体报警箱: 22,
  签到机: 23,
  浅污泵: 24,
  消防水泵: 24,
  人脸机: 25,
  人脸识别机: 25,
  示教前端机: 26,
  示教终端机: 27,
  手报: 28,
  智能分析类: 28,
  电能分析仪: 28,
  视频辅助: 28,
  手持对讲机: 29,
  刷卡机: 30,
  水表箱: 31,
  停车位: 32,
  车辆管理: 32,
  压力计: 33,
  闸机: 34,
  主机: 35,
  电池组: 35,
  车位探测器: 36,
  车位引导类设备: 36,
  车位传感器: 36,
  道闸: 37,
  道闸一体机: 37,
  低压空气断路器: 38,
  发电机: 39,
  风机盘管: 40,
  扶梯: 41,
  功率放大器: 42,
  红外探测器: 43,
  呼叫站: 44,
  紧急按钮: 45,
  精密空调: 46,
  控制主机: 47,
  冷冻机组: 48,
  冷却泵: 49,
  冷却塔: 50,
  "配电柜/箱": 51,
  生活水箱: 52,
  声光报警器: 53,
  手动报警器: 53,
  水泵: 54,
  温控仪变压器: 55,
  智能气表: 56,
  充电桩: 57,
  灭火器: 58,
  水压监测: 59,
  理货机: 60,
  温控: 61,
  污水处理: 62,
  新风设备: 63,
  档位: 64,
  考勤机: 65,
  气体监测: 66,
  入侵报警: 67,
  入侵报警系统: 67,
  消防水压监测: 68,
  消防水压传感器: 68,
  温湿度监测设备: 69,
  巡更点: 70,
  风险源: 71,
  资产: 72,
  计算机网络: 73,
  无线通讯: 74,
  可视对讲: 101,
};

const textureMap = new Map<string, string>();
const img_bg = new Image();
const img_border = new Image();

async function waitBaseAssetsLoad(): Promise<void> {
  img_border.src = IMG_BORDER;
  img_bg.src = IMG_BG;
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      img_border.onload = () => resolve();
      img_border.onerror = reject;
    }),
    new Promise<void>((resolve, reject) => {
      img_bg.onload = () => resolve();
      img_bg.onerror = reject;
    }),
  ]);
}

function mergeImages(img: HTMLImageElement, hexColor = "#16baaa"): string {
  // 验证十六进制颜色格式
  if (!/^#[0-9A-F]{6}$/i.test(hexColor)) {
    throw new Error("Invalid hex color format. Expected format like #FF0000");
  }

  // 将十六进制转换为RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas context error");
  }

  // 使用第一张图片的宽高设置canvas
  canvas.width = img_border.width;
  canvas.height = img_border.height;

  // 先绘制指定颜色的背景
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制第一张图片轮廓
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img_border, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  // 缩小第二张图片（缩小比例为0.4）
  const scale = 0.4;
  const scaledWidth = img_bg.width * scale;
  const scaledHeight = img_bg.height * scale;
  const x = (img_border.width - scaledWidth) / 2;
  const y = (img_border.height - scaledHeight) / 10;
  ctx.drawImage(img_bg, x, y, scaledWidth, scaledHeight);

  // 创建临时canvas处理第三张图片
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    throw new Error("canvas context error");
  }
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  tempCtx.drawImage(img, 0, 0);

  // 获取像素数据
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  // 遍历像素点，将白色改为指定颜色
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
      data[i] = r; // R
      data[i + 1] = g; // G
      data[i + 2] = b; // B
    }
  }

  // 将修改后的像素数据放回
  tempCtx.putImageData(imageData, 0, 0);

  const img3Scale = 120 / img.width;
  const img3Width = img.width * img3Scale;
  const img3Height = img.height * img3Scale;

  // 计算放大后图片的居中位置
  const img3X = x + (scaledWidth - img3Width) / 2;
  const img3Y = y + (scaledHeight - img3Height) / 2;

  // 绘制处理后的第三张图片
  ctx.drawImage(tempCanvas, img3X, img3Y, img3Width, img3Height);
  tempCanvas.remove();
  canvas.remove();
  return canvas.toDataURL("image/webp", 1.0);
}

async function generateBuildingLabelCanvas(
  text: string,
  iconSrc = BUILD_LABEL_ICON,
): Promise<{
  base64: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context error");

    // 测量文本宽度
    ctx.font = "16px Arial";
    const textWidth = ctx.measureText(text).width;
    const padding = 20;
    const bgWidth = textWidth + padding * 2;

    // 设置 Canvas 尺寸
    const width = 50 + bgWidth + 20;
    const height = 70;
    canvas.width = width * 3;
    canvas.height = height * 3;

    // 绘制背景
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true; // 启用抗锯齿

    // 加载所有图片资源
    const iconBg = new Image();
    const icon = new Image();
    const arrow = new Image();

    Promise.all([
      new Promise<void>((resolve) => {
        iconBg.src = BUILD_LABEL_ICON_BG;
        iconBg.onload = () => resolve();
      }),
      new Promise<void>((resolve) => {
        icon.src = iconSrc;
        icon.onload = () => resolve();
      }),
      new Promise<void>((resolve) => {
        arrow.src = BUILD_BOTTOM;
        arrow.onload = () => resolve();
      }),
    ]).then(() => {
      // 绘制文本背景
      ctx.fillStyle = "#1169e1";
      ctx.save();
      ctx.transform(1, 0, -0.2679, 1, 0, 0);
      ctx.fillRect(50 * 3, 12 * 3, bgWidth * 3, 32 * 3); // 3倍尺寸
      ctx.restore();

      // 绘制图标背景
      ctx.drawImage(iconBg, 10 * 3, 10 * 3, 42 * 3, 36 * 3); // 3倍尺寸

      // 绘制图标
      ctx.drawImage(icon, 13 * 3, 13 * 3, 36 * 3, 30 * 3); // 3倍尺寸

      // 绘制文本
      ctx.font = "48px Arial"; // 调整为3倍字体大小(16px*3=48px)
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.transform(1, 0, 0, 1, 0, 0);
      ctx.fillText(text, (55 + 10) * 3, 30 * 3); // 保持3倍坐标
      ctx.restore();

      // 绘制底部箭头
      ctx.drawImage(arrow, (width / 2 - 10) * 3, (height - 10) * 3, 20 * 3, 10 * 3); // 3倍尺寸

      resolve({
        base64: canvas.toDataURL("image/webp", 1.0),
        width: width,
        height: height,
      });
    });
  });
}

export class IconLabelHelper {
  public async loadingDeviceIconTexture(): Promise<void> {
    loadingHelper.initLogoLoadingContainer();
    loadingHelper.setProgressText("设备图标纹理预加载...");
    await waitBaseAssetsLoad();
    const tasks = [];
    for (const key in deviceIconShapeMap) {
      const image = new Image();
      image.src = deviceIconShapeMap[Number(key)];
      tasks.push(
        new Promise<void>((resolve) => {
          image.onload = async () => {
            textureMap.set("device-icon-success-" + key, mergeImages(image, "#16baaa"));
            textureMap.set("device-icon-error-" + key, mergeImages(image, "#ff5722"));
            image.remove();
            resolve();
          };
        }),
      );
    }
    await Promise.all(tasks);
    loadingHelper.setProgressText("设备图标纹理加载完成");
  }
  public getDeviceIconBase64(prodCategoryName: string, type: string): string {
    const key = `device-icon-${type}-${DeviceIconMap[prodCategoryName] || 1}`;
    return textureMap.get(key) || "";
  }
  public async generateBuildingLabelBase64(text: string): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    return generateBuildingLabelCanvas(text);
  }
}
export const iconLabelHelper = new IconLabelHelper();
