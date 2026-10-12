const logoSrc = "/resource/v1/cube-visual-sdk/loading-container/images/logo.gif";
class LoadingContainer {
  public loadingContainer: HTMLDivElement | undefined;

  public initLogoLoadingContainer(): void {
    if (this.loadingContainer) {
      return;
    }
    this.loadingContainer = document.createElement("div");
    const logo = document.createElement("img");
    const content = document.createElement("div");
    const textContainer = document.createElement("div");
    textContainer.id = "loading-progress-text-container";
    textContainer.style.whiteSpace = "nowrap";
    logo.style.width = "20px";
    logo.style.width = "40px";
    logo.src = logoSrc;
    this.loadingContainer.style.position = "absolute";
    this.loadingContainer.style.top = "0";
    this.loadingContainer.style.left = "0";
    this.loadingContainer.style.width = "100%";
    this.loadingContainer.style.height = "100%";
    this.loadingContainer.style.backgroundColor = "rgba(0,0,0,0.2)";
    this.loadingContainer.style.zIndex = "9999";
    this.loadingContainer.style.display = "flex";
    this.loadingContainer.style.justifyContent = "center";
    this.loadingContainer.style.alignItems = "center";
    this.loadingContainer.style.color = "rgba(255,255,255,0.8)";
    this.loadingContainer.style.fontSize = "12px";
    textContainer.style.marginTop = "10px";
    content.style.padding = "20px";
    content.style.textAlign = "center";
    content.appendChild(logo);
    content.appendChild(textContainer);
    this.loadingContainer.appendChild(content);
    document.body.appendChild(this.loadingContainer);
  }

  public setProgressText(text: string): void {
    const textContainer = document.getElementById("loading-progress-text-container");
    if (textContainer) {
      textContainer.innerHTML = text;
    }
  }

  public clear(): void {
    this.loadingContainer?.remove();
  }
}

export const loadingHelper = new LoadingContainer();
