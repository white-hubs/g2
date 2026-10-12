import QRCode from "qrcode";
/** 公共二维码导出能力，所有领域统一消费，避免私带 UI/二维码实现。 */
export function generateQrCode(value: string): Promise<string> {
  if (!value) {
    return Promise.reject(new Error("二维码内容不能为空"));
  }
  return QRCode.toDataURL(value, { width: 500, margin: 2, errorCorrectionLevel: "M" });
}
