export interface TagValue {
  value: any;
  quality: "good" | "bad" | "uncertain";
  timestamp: number;
}

export type TagValueMap = Record<string, TagValue>;
export type Unsubscribe = () => void;

export interface DataDriver {
  subscribe(tags: string[], cb: (values: TagValueMap) => void): Unsubscribe;
  read(tags: string[]): Promise<TagValueMap>;
  write(tag: string, value: any): Promise<void>;
}
