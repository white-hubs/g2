import type { DataDriver, TagValue, TagValueMap, Unsubscribe } from "../../core";

export interface ManualTagConfig {
  type?: "number" | "boolean" | "string";
}

type Subscriber = {
  tags: string[];
  cb: (values: TagValueMap) => void;
};

/**
 * A push-based DataDriver where tag values are driven externally via setTagValue().
 * Used by the ViewerView inside the iframe to receive tag updates from the host.
 *
 * Accepts optional tag type config so that incoming values are coerced to the
 * correct JS type (matching the behavior of MockDriver). Without this coercion,
 * toggleTag (which defaults to numeric 1/0) would break boolean transforms like
 * `value === true ? '运行中' : '停止'`.
 */
export class ManualDriver implements DataDriver {
  private readonly values = new Map<string, TagValue>();
  private readonly subscribers = new Set<Subscriber>();
  private readonly config: Record<string, ManualTagConfig>;

  constructor(initialValues: Record<string, string | number | boolean> = {}, config: Record<string, ManualTagConfig> = {}) {
    this.config = config;
    for (const [tag, value] of Object.entries(initialValues)) {
      this.values.set(tag, this.wrap(this.normalizeValue(tag, value)));
    }
  }

  /**
   * Set tag type configuration after construction (e.g. once the page model is available).
   * Coerces existing stored values to the declared types as well.
   */
  setTagTypes(tags: Array<{ name: string; type: "boolean" | "number" | "string" }>): void {
    for (const tag of tags) {
      this.config[tag.name] = { type: tag.type };
      // Re-coerce any already-stored value for this tag
      const existing = this.values.get(tag.name);
      if (existing !== undefined) {
        const coerced = this.normalizeValue(tag.name, existing.value);
        this.values.set(tag.name, this.wrap(coerced));
      }
    }
  }

  subscribe(tags: string[], cb: (values: TagValueMap) => void): Unsubscribe {
    const subscriber: Subscriber = { tags, cb };
    this.subscribers.add(subscriber);
    cb(this.buildSnapshot(tags));
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  async read(tags: string[]): Promise<TagValueMap> {
    return this.buildSnapshot(tags);
  }

  async write(tag: string, value: any): Promise<void> {
    this.setTagValue(tag, value);
  }

  setTagValue(tag: string, value: string | number | boolean): void {
    const normalized = this.normalizeValue(tag, value);
    this.values.set(tag, this.wrap(normalized));
    for (const sub of this.subscribers) {
      if (sub.tags.includes(tag)) {
        sub.cb(this.buildSnapshot(sub.tags));
      }
    }
  }

  getTagValue(tag: string): string | number | boolean | undefined {
    return this.values.get(tag)?.value as string | number | boolean | undefined;
  }

  /**
   * Coerce a written value to the declared tag type.
   * Mirrors MockDriver.normalizeWriteValue so that action-originated writes
   * (e.g. toggleTag sending numeric 1/0) produce type-correct values that
   * satisfy strict transform comparisons like `value === true`.
   */
  private normalizeValue(tag: string, value: any): string | number | boolean {
    const cfg = this.config[tag];

    if (!cfg?.type) {
      // If the tag already has a typed value stored, coerce to the same type
      // so successive writes remain consistent (e.g. init as boolean → keep boolean).
      const existing = this.values.get(tag);
      if (existing !== undefined) {
        const existingType = typeof existing.value;
        if (existingType === "boolean" && typeof value !== "boolean") {
          return typeof value === "number" ? value !== 0 : Boolean(value);
        }
        if (existingType === "number" && typeof value !== "number") {
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        }
        if (existingType === "string" && typeof value !== "string") {
          return String(value ?? "");
        }
      }
      // Auto-coerce numeric strings so toggle values match numeric tags.
      if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
      return value as string | number | boolean;
    }

    if (cfg.type === "boolean") {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        const s = value.trim().toLowerCase();
        if (s === "true" || s === "1" || s === "on") return true;
        if (s === "false" || s === "0" || s === "off") return false;
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

    return value as string | number | boolean;
  }

  private wrap(value: string | number | boolean): TagValue {
    return { value, quality: "good", timestamp: Date.now() };
  }

  private buildSnapshot(tags: string[]): TagValueMap {
    const snapshot: TagValueMap = {};
    for (const tag of tags) {
      const tv = this.values.get(tag);
      if (tv) snapshot[tag] = tv;
    }
    return snapshot;
  }
}
