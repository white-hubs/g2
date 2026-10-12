type DomLike = {
  classList?: { contains: (name: string) => boolean };
  parentElement?: DomLike | null;
  requestFullscreen?: () => Promise<void>;
};

export function findVideoFullscreenContainer(target: EventTarget | null, classNames: string[]): DomLike | null {
  let element = target as DomLike | null;
  while (element) {
    const current = element;
    if (classNames.some((name) => current.classList?.contains(name))) {
      return current;
    }
    element = element.parentElement ?? null;
  }
  return null;
}

export function requestVideoFullscreen(event: MouseEvent, classNames: string[]): boolean {
  const element = findVideoFullscreenContainer(event.currentTarget, classNames);
  if (element?.requestFullscreen) {
    void element.requestFullscreen();
    return true;
  }
  return false;
}

export function exitVideoFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
}
