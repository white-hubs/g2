import { Inspector } from "@babylonjs/inspector";
import keymaster from "keymaster";
import { Pane } from "tweakpane";

import { cubeWeb3DInstance } from "../web-3d";
import { createAxis, removeAxis } from "./axis-helper";
// @ts-expect-error
import type { ArcRotateCamera } from "@babylonjs/core";
import Stats from "stats-js";
const panelParams = {
  showAxisHelper: false,
  showInspector: false,
};
let pane: Pane | null = null;
let stats: Stats = null;

function updateStats(): void {
  if (stats) {
    stats.begin();
    stats.end();
    requestAnimationFrame(updateStats);
  }
}
const toggleGUIPanel = (): void => {
  if (!pane) {
    pane = new Pane();
    pane.addBinding(panelParams, "showAxisHelper", { label: "显示坐标轴" }).on("change", (ev) => {
      ev.value ? createAxis(10000) : removeAxis();
    });
    pane.addBinding(panelParams, "showInspector", { label: "显示调式工具" }).on("change", (ev) => {
      if (ev.value) {
        Inspector.Show(cubeWeb3DInstance._scene, {});
        (document.querySelector("#scene-explorer-host") as unknown as HTMLElement).style.zIndex = "9999";
        (document.querySelector("#inspector-host") as unknown as HTMLElement).style.zIndex = "99999";
        // 公共关闭处理函数
        const handleClose = (): void => {
          Inspector.Hide();
          panelParams.showInspector = false;
          pane?.refresh();
        };
        (document.querySelector("#actionTabs #header #commands .close") as unknown as HTMLElement).addEventListener("click", handleClose);
        (document.querySelector("#sceneExplorer #header #commands .close") as unknown as HTMLElement).addEventListener(
          "click",
          handleClose,
        );
      } else {
        Inspector.Hide();
      }
    });

    stats = new Stats();
    stats.showPanel(0); // 0: FPS, 1: MS, 2: MB

    // 设置容器样式
    stats.dom.style.position = "relative";
    stats.dom.style.display = "flex";
    stats.dom.style.flexDirection = "row"; // 明确设置为横向排列
    stats.dom.style.pointerEvents = "none";
    stats.dom.style.userSelect = "none";
    stats.dom.style.width = "100%";
    stats.dom.style.height = "48px";
    stats.dom.style.overflow = "hidden"; // 防止内容溢出

    // 遍历子元素应用统一样式
    Array.from(stats.dom.children).forEach((value, index) => {
      const element = value as HTMLElement;
      element.style.display = "block";
      element.style.flex = "1"; // 使用flex布局平均分配空间
      element.style.minWidth = "0"; // 防止内容溢出
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative"; // 确保子元素不重叠

      // 如果是第一个元素，可以去掉左边距
      if (index === 0) {
        element.style.marginLeft = "0";
      }
    });

    const button = pane.addButton({
      title: "一键获取相机参数",
    });
    button.on("click", () => {
      const camera = cubeWeb3DInstance._scene.activeCamera as ArcRotateCamera;
      const viewAngleParameter = JSON.stringify({
        target: {
          x: camera.target.x,
          y: camera.target.y,
          z: camera.target.z,
        },
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
      });
      const aux = document.createElement("input");
      aux.setAttribute("value", viewAngleParameter);
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      document.body.removeChild(aux);
    });

    pane.element.appendChild(stats.dom);
    updateStats();
    const paneDom = document.querySelector(".tp-dfwv");
    if (paneDom) {
      (paneDom as HTMLElement).style.zIndex = "9999";
    }
  } else {
    pane.dispose();
    pane = null;
    stats.dom.parentNode.removeChild(stats.dom);
    stats = null;
  }
};

export function registerGUIPanel(): void {
  keymaster("ctrl+/", () => {
    toggleGUIPanel();
  });
}
