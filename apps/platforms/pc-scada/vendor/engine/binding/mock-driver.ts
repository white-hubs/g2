import type { DataDriver, TagValue, TagValueMap, Unsubscribe } from "../../core";

export interface MockTagConfig {
  min?: number;
  max?: number;
  type?: "number" | "boolean" | "string";
  values?: any[];
}

export interface MockDriverOptions {
  /** Whether to generate random values on every polling tick. Default: true */
  randomize?: boolean;
}

export class MockDriver implements DataDriver {
  private config: Record<string, MockTagConfig>;
  private interval: number;
  private randomize: boolean;
  private overrides: Record<string, any> = {};
  private subscribers = new Set<{ tags: string[]; cb: (values: TagValueMap) => void }>();

  constructor(config: Record<string, MockTagConfig> = {}, interval = 1000, options: MockDriverOptions = {}) {
    this.config = config;
    this.interval = interval;
    this.randomize = options.randomize ?? true;
  }

  subscribe(tags: string[], cb: (values: TagValueMap) => void): Unsubscribe {
    const subscription = { tags, cb };
    this.subscribers.add(subscription);
    // 首次订阅时立即推送一次，避免首次渲染等待 interval。
    cb(this.buildValues(tags));

    const timer = setInterval(() => {
      cb(this.buildValues(tags));
    }, this.interval);

    return () => {
      clearInterval(timer);
      this.subscribers.delete(subscription);
    };
  }

  async read(tags: string[]): Promise<TagValueMap> {
    return this.buildValues(tags);
  }

  /** Clear all written overrides and push fresh values to current subscribers. */
  reset(): void {
    this.overrides = {};
    for (const subscriber of this.subscribers) {
      subscriber.cb(this.buildValues(subscriber.tags));
    }
  }

  async write(tag: string, value: any): Promise<void> {
    if (!tag) {
      console.warn("[MockDriver] skip write: empty tag");
      return;
    }
    this.overrides[tag] = this.normalizeWriteValue(tag, value);
    this.pushWriteUpdate(tag);
    console.log(`[MockDriver] write ${tag} = ${JSON.stringify(this.overrides[tag])}`);
  }

  private buildValues(tags: string[]): TagValueMap {
    const values: TagValueMap = {};
    for (const tag of tags) {
      values[tag] = this.generateValue(tag);
    }
    return values;
  }

  private pushWriteUpdate(changedTag: string) {
    for (const subscriber of this.subscribers) {
      if (!subscriber.tags.includes(changedTag)) continue;
      // Push a full snapshot for this subscription, not a partial delta.
      // BindingEngine recomputes bound props from the callback payload; sending
      // only one changed tag would make other bound tags appear "missing" in
      // this tick and temporarily fall back to default element props.
      subscriber.cb(this.buildValues(subscriber.tags));
    }
  }

  private generateValue(tag: string): TagValue {
    if (Object.prototype.hasOwnProperty.call(this.overrides, tag)) {
      return { value: this.overrides[tag], quality: "good", timestamp: Date.now() };
    }
    const cfg = this.config[tag] ?? {};
    const now = Date.now();

    if (!this.randomize) {
      if (cfg.values && cfg.values.length > 0) {
        return { value: cfg.values[0], quality: "good", timestamp: now };
      }
      switch (cfg.type) {
        case "boolean":
          return { value: false, quality: "good", timestamp: now };
        case "string":
          return { value: "", quality: "good", timestamp: now };
        default: {
          const min = cfg.min ?? 0;
          return { value: min, quality: "good", timestamp: now };
        }
      }
    }

    if (cfg.values && cfg.values.length > 0) {
      const idx = Math.floor(Math.random() * cfg.values.length);
      return { value: cfg.values[idx], quality: "good", timestamp: now };
    }

    switch (cfg.type) {
      case "boolean":
        return { value: Math.random() > 0.5, quality: "good", timestamp: now };
      case "string":
        return { value: `mock-${tag}`, quality: "good", timestamp: now };
      default: {
        const min = cfg.min ?? 0;
        const max = cfg.max ?? 100;
        return {
          value: Math.round((Math.random() * (max - min) + min) * 100) / 100,
          quality: "good",
          timestamp: now,
        };
      }
    }
  }

  private normalizeWriteValue(tag: string, value: any): any {
    const cfg = this.config[tag];
    if (!cfg?.type) {
      // Auto-coerce numeric strings so write values match the tag's numeric
      // initial values, ensuring the tween can interpolate between them.
      if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
      return value;
    }

    if (cfg.type === "boolean") {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1" || normalized === "on") return true;
        if (normalized === "false" || normalized === "0" || normalized === "off") return false;
      }
      return Boolean(value);
    }

    if (cfg.type === "number") {
      if (typeof value === "number") return value;
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }

    if (cfg.type === "string") {
      return String(value ?? "");
    }

    return value;
  }
}
