import { getFiles } from "./context";
import { type Row, text } from "./model";

export const COURSEWARE_SCENE = "SAFETY_EDUCATION::COURSEWARE";

/** 课件库和任务附件使用同一正式上传契约，媒体时长读取完成后再进入表单。 */
export async function uploadCourseware(file: File): Promise<Row> {
  const uploaded = await (await getFiles()).uploadSceneFile({ file, businessKey: COURSEWARE_SCENE, sceneCode: COURSEWARE_SCENE });
  let duration = 0;
  if (/^(video|audio)\//u.test(file.type)) {
    duration = await new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = document.createElement("video");
      media.preload = "metadata";
      const finish = () => {
        URL.revokeObjectURL(url);
        media.removeAttribute("src");
        media.load();
      };
      media.onloadedmetadata = () => {
        const value = Math.round(media.duration);
        finish();
        resolve(Number.isFinite(value) ? value : 0);
      };
      media.onerror = () => {
        finish();
        reject(new Error("无法读取附件时长，请检查媒体文件"));
      };
      media.src = url;
    });
  }
  return { ...uploaded, id: text(uploaded.id), name: file.name, size: file.size, duration };
}
