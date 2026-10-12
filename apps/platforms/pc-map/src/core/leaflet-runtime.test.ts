import { expect, test } from "bun:test";

test("InteractiveMap rotates the actual Leaflet pane and retains coordinate hit testing", async () => {
  // Isolate DOM globals from other Bun suites; exercise the platform entry used by domains.
  const source = `
    import { JSDOM } from "jsdom";
    const dom = new JSDOM('<div id="map" style="width:800px;height:600px"></div>', { url: "http://localhost" });
    for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "SVGElement", "Image", "getComputedStyle"]) {
      Object.defineProperty(globalThis, key, { configurable: true, value: key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key] });
    }
    const container = document.getElementById("map");
    Object.defineProperties(container, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
    const { default: L } = await import("./src/core/leaflet-runtime");
    L.Browser.any3d = true;
    const { InteractiveMap } = await import("./src/index");
    const controller = new InteractiveMap();
    await controller.renderMap("map", { center: { lng: 116.397428, lat: 39.90923 } });
    controller.setRotation(45);
    const map = controller.getMapInstance();
    const center = map.containerPointToLatLng(L.point(400, 300));
    const pane = container.querySelector(".leaflet-rotate-pane");
    console.log(JSON.stringify({ bearing: controller.getMapInfo().rotation, transform: pane?.style.transform, center: { lng: center.lng, lat: center.lat } }));
    controller.destroy();
    dom.window.close();
  `;
  const child = Bun.spawn([process.execPath, "-e", source], {
    cwd: new URL("../../", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, error, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect({ exit, error }).toEqual({ exit: 0, error: "" });
  const result = JSON.parse(output.trim()) as { bearing: number; transform: string; center: { lng: number; lat: number } };
  expect(result.bearing).toBe(45);
  expect(result.transform).toContain("rotate(");
  expect(result.center.lng).toBeCloseTo(116.397428, 4);
  expect(result.center.lat).toBeCloseTo(39.90923, 4);
});

test("InteractiveMap renders TianDiTu vector labels above the base tiles", async () => {
  const source = `
    import { JSDOM } from "jsdom";
    const dom = new JSDOM('<div id="map" style="width:800px;height:600px"></div>', { url: "http://localhost" });
    for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "SVGElement", "Image", "getComputedStyle"]) {
      Object.defineProperty(globalThis, key, { configurable: true, value: key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key] });
    }
    window.T = {};
    const container = document.getElementById("map");
    Object.defineProperties(container, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
    await import("./src/core/leaflet-runtime");
    const { InteractiveMap } = await import("./src/index");
    const controller = new InteractiveMap({ mapType: "TD_MAP", webKey: "test-key" });
    await controller.renderMap("map", { center: { lng: 116.397428, lat: 39.90923 } });
    const tiles = Array.from(container.querySelectorAll("img.leaflet-tile")).map((tile) => tile.src);
    console.log(JSON.stringify({ tiles, layers: container.querySelectorAll(".leaflet-tile-pane .leaflet-layer").length }));
    controller.destroy();
    dom.window.close();
  `;
  const child = Bun.spawn([process.execPath, "-e", source], {
    cwd: new URL("../../", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, error, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect({ exit, error }).toEqual({ exit: 0, error: "" });
  const result = JSON.parse(output.trim()) as { tiles: string[]; layers: number };
  expect(result.tiles.some((url) => url.includes("T=vec_w"))).toBe(true);
  expect(result.tiles.some((url) => url.includes("T=cva_w"))).toBe(true);
  expect(result.layers).toBe(2);
});
