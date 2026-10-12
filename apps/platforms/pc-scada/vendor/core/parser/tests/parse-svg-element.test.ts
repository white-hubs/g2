import { describe, expect, it } from "vitest";

import { parseSvgElement } from "../parse-svg-element";

describe("parseSvgElement", () => {
  it("parses extended prop schema fields", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:scada="http://cube-scada.io/ns/v1" viewBox="0 0 100 100">
  <metadata>
    <scada:element>
      <scada:meta type="fan" label="Fan" category="Industrial" version="1.0.0"/>
      <scada:props>
        <scada:prop name="speed" type="number" label="Speed" default="1000" min="0" max="3000" step="100" precision="0" unit="ms" domain="observe" semantic="status.speed" required="true" bindable="true" controllable="false"/>
      </scada:props>
      <scada:mappings/>
      <scada:animations/>
    </scada:element>
  </metadata>
  <circle cx="50" cy="50" r="40" />
</svg>`;

    const def = parseSvgElement(svg);
    expect(def.propsSchema[0]).toMatchObject({
      name: "speed",
      domain: "observe",
      semantic: "status.speed",
      required: true,
      bindable: true,
      controllable: false,
      step: 100,
      precision: 0,
      unit: "ms",
    });
  });

  it("falls back to observe domain for legacy props", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:scada="http://cube-scada.io/ns/v1" viewBox="0 0 100 100">
  <metadata>
    <scada:element>
      <scada:meta type="legacy" label="Legacy" category="Industrial" version="1.0.0"/>
      <scada:props>
        <scada:prop name="running" type="boolean" label="Running" default="false"/>
      </scada:props>
      <scada:mappings/>
      <scada:animations/>
    </scada:element>
  </metadata>
  <circle cx="50" cy="50" r="40" />
</svg>`;

    const def = parseSvgElement(svg);
    expect(def.propsSchema[0].domain).toBe("observe");
    expect(def.propsSchema[0].bindable).toBe(true);
    expect(def.propsSchema[0].controllable).toBe(false);
  });
});
