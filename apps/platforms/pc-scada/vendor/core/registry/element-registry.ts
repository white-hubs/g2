import { parseSvgElement } from "../parser/parse-svg-element";
import type { ElementDef } from "../types/element";

export class ElementRegistry {
  private defs = new Map<string, ElementDef>();

  async registerFromSvg(svgString: string): Promise<ElementDef> {
    const def = parseSvgElement(svgString);
    this.defs.set(def.type, def);
    return def;
  }

  async registerPackage(svgModules: Record<string, string>): Promise<void> {
    for (const svg of Object.values(svgModules)) {
      await this.registerFromSvg(svg);
    }
  }

  register(def: ElementDef): void {
    this.defs.set(def.type, def);
  }

  unregister(type: string): boolean {
    return this.defs.delete(type);
  }

  get(type: string): ElementDef | undefined {
    return this.defs.get(type);
  }

  has(type: string): boolean {
    return this.defs.has(type);
  }

  getAll(): ElementDef[] {
    return [...this.defs.values()];
  }

  getByCategory(): Record<string, ElementDef[]> {
    const result: Record<string, ElementDef[]> = {};
    for (const def of this.defs.values()) {
      if (!result[def.category]) {
        result[def.category] = [];
      }
      result[def.category].push(def);
    }
    return result;
  }

  clear(): void {
    this.defs.clear();
  }
}

export const registry = new ElementRegistry();
