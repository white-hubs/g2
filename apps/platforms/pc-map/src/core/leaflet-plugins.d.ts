import "leaflet";

declare module "leaflet" {
  interface Point {
    rotateFrom(theta: number, pivot: Point): Point;
    rotate(theta: number): Point;
  }
  interface Map {
    getBearing(): number;
    setBearing(angle: number): this;
  }
  interface MapOptions {
    rotateControl?: boolean;
    rotate?: boolean;
  }
  interface HeatLayer extends Layer {}
  interface MarkerClusterGroup extends Layer {
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    clearLayers(): this;
    getLayers(): Layer[];
  }
  function heatLayer(points: Array<[number, number, number]>, options?: unknown): HeatLayer;
  function markerClusterGroup(options?: unknown): MarkerClusterGroup;
}
