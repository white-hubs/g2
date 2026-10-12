const logoSrc = "/resource/v1/cube-visual-sdk/loading-container/images/logo.gif";
export class LoadingContainer {
  public initBackgroundContainer(filePath: string, callback: () => void): HTMLDivElement {
    const backgroundContainer = document.createElement("div");
    backgroundContainer.style.position = "absolute";
    backgroundContainer.style.top = "0";
    backgroundContainer.style.left = "0";
    backgroundContainer.style.width = "100%";
    backgroundContainer.style.height = "100%";
    const operatingContainer = document.createElement("div");
    operatingContainer.style.position = "absolute";
    operatingContainer.style.bottom = "80px";
    operatingContainer.style.left = "0";
    operatingContainer.style.right = "0";
    operatingContainer.style.margin = "0 auto";
    operatingContainer.style.backgroundColor = "#9AD6EF";
    operatingContainer.style.borderRadius = "40px";
    operatingContainer.style.width = "440px";
    const operatingBtn = document.createElement("div");
    operatingBtn.style.color = "#000";
    operatingBtn.style.fontSize = "18px";
    operatingBtn.style.textAlign = "center";
    operatingBtn.style.cursor = "pointer";
    operatingBtn.style.padding = "10px 0";
    operatingBtn.innerText = "进入模型";
    operatingContainer.appendChild(operatingBtn);
    operatingContainer.onclick = () => {
      // loading容器
      const loadingContainer = document.createElement("div");
      loadingContainer.id = "loading-container";
      loadingContainer.style.position = "relative";
      loadingContainer.style.width = "300px";
      loadingContainer.style.padding = "10px 0";
      loadingContainer.style.margin = "0 auto";
      const tipsContainer = document.createElement("div");
      tipsContainer.innerText = "模型加载中";
      tipsContainer.style.textAlign = "center";
      tipsContainer.style.fontSize = "16px";
      loadingContainer.appendChild(tipsContainer);
      const progressContainer = this.createLoadingProgress();
      loadingContainer.appendChild(progressContainer);
      operatingContainer.removeChild(operatingBtn);
      operatingContainer.appendChild(loadingContainer);
      callback();
    };
    const image = new Image();
    image.src = filePath;
    image.style.width = "100%";
    image.style.height = "100%";
    backgroundContainer.appendChild(image);
    backgroundContainer.appendChild(operatingContainer);
    return backgroundContainer;
  }

  public initLogoLoadingContainer(): HTMLDivElement {
    const loadingContainer = document.createElement("div");
    const logo = document.createElement("img");
    const content = document.createElement("div");
    const textContainer = document.createElement("div");
    textContainer.id = "loading-progress-text-container";
    logo.style.width = "20px";
    logo.style.width = "40px";
    logo.src = logoSrc;
    loadingContainer.style.position = "absolute";
    loadingContainer.style.top = "0";
    loadingContainer.style.left = "0";
    loadingContainer.style.width = "100%";
    loadingContainer.style.height = "100%";
    loadingContainer.style.backgroundColor = "rgba(0,0,0,0.2)";
    loadingContainer.style.zIndex = "9999";
    loadingContainer.style.display = "flex";
    loadingContainer.style.justifyContent = "center";
    loadingContainer.style.alignItems = "center";
    loadingContainer.style.color = "rgba(0,0,0,0.8)";
    loadingContainer.style.fontSize = "12px";
    textContainer.style.marginTop = "10px";
    content.style.padding = "20px";
    content.style.width = "100px";
    content.style.textAlign = "center";
    content.appendChild(logo);
    content.appendChild(textContainer);
    loadingContainer.appendChild(content);
    return loadingContainer;
  }

  private createLoadingProgress(): HTMLDivElement {
    // 进度条容器
    const progressContainer = document.createElement("div");
    progressContainer.style.display = "flex";
    progressContainer.style.justifyContent = "center";
    progressContainer.style.alignItems = "center";
    // 外部总进度
    const progressOut = document.createElement("div");
    progressOut.style.width = "100%";
    progressOut.style.height = "10px";
    progressOut.style.background = "#fff";
    progressOut.style.borderRadius = "25px";
    // 内部实际进度
    const loadingProgress = document.createElement("div");
    loadingProgress.id = "loading-progress";
    loadingProgress.style.width = "100%";
    loadingProgress.style.height = "10px";
    loadingProgress.style.background = "#0f0";
    loadingProgress.style.borderRadius = "25px";
    // 进度文本
    const loadingProgressText = document.createElement("div");
    loadingProgressText.id = "loading-progress-text";
    loadingProgressText.innerText = "0%";
    loadingProgressText.style.textAlign = "center";
    loadingProgressText.style.width = "100px";
    loadingProgressText.style.marginLeft = "10px";
    loadingProgressText.style.fontSize = "16px";
    progressOut.appendChild(loadingProgress);
    progressContainer.appendChild(progressOut);
    progressContainer.appendChild(loadingProgressText);
    return progressContainer;
  }
}
