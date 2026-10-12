import { computed, ref, shallowRef, type Ref } from "vue";

import type { FireEventViewModel, FloorMapImageRect, FloorMapPoint } from "../models";

const EMPTY_IMAGE_RECT: FloorMapImageRect = { left: 0, top: 0, width: 0, height: 0 };

export function useFloorMap(events: Ref<FireEventViewModel[]>) {
  const isVisible = shallowRef(false);
  const activePoint = shallowRef<FloorMapPoint | null>(null);
  const selectedAreaName = shallowRef("");
  const currentMapImage = shallowRef("");
  const isLoading = shallowRef(false);
  const imageRect = ref<FloorMapImageRect>({ ...EMPTY_IMAGE_RECT });
  const imageFrameElement = shallowRef<HTMLElement | null>(null);
  const imageElement = shallowRef<HTMLImageElement | null>(null);

  const sameLocationPoints = computed<FloorMapPoint[]>(() => {
    const location = activePoint.value?.locationName;
    if (!location) return [];
    return events.value
      .filter((item) => item.location === location)
      .map((item) => ({
        id: item.id,
        code: item.deviceInfo,
        locationName: item.location,
        eventType: item.eventName,
        pointName: item.pointName,
        posX: item.posX,
        posY: item.posY,
      }));
  });

  const updateImageRect = (): void => {
    const frame = imageFrameElement.value;
    const image = imageElement.value;
    if (!frame || !image || !image.naturalWidth || !image.naturalHeight) return;
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const frameRatio = frame.clientWidth / frame.clientHeight;
    let width = frame.clientWidth;
    let height = frame.clientHeight;
    if (naturalRatio > frameRatio) height = frame.clientWidth / naturalRatio;
    else width = frame.clientHeight * naturalRatio;
    imageRect.value = { left: (frame.clientWidth - width) / 2, top: (frame.clientHeight - height) / 2, width, height };
  };

  const openFromEvent = (event: FireEventViewModel): void => {
    activePoint.value = {
      id: event.id,
      code: event.deviceInfo,
      locationName: event.location,
      eventType: event.eventName,
      pointName: event.pointName,
      posX: event.posX,
      posY: event.posY,
    };
    selectedAreaName.value = event.location;
    currentMapImage.value = "";
    isVisible.value = true;
  };

  return {
    isVisible,
    activePoint,
    sameLocationPoints,
    selectedAreaName,
    currentMapImage,
    isLoading,
    imageRect,
    openFromEvent,
    close: () => (isVisible.value = false),
    setImageFrameRef: (element: Element | null) => (imageFrameElement.value = element as HTMLElement | null),
    setImageRef: (element: Element | null) => (imageElement.value = element as HTMLImageElement | null),
    handleImageLoad: updateImageRect,
  };
}
