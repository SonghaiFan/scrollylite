export * from "./index.js";

type AnyRecord = Record<string, any>;
type Target = string | Element;

interface BrowserCreateStoryOptions {
  target?: Target;
  d3?: any;
  aq?: any;
  debug?: boolean;
}

export function createStory(
  spec: AnyRecord,
  options?: BrowserCreateStoryOptions
): Promise<{
  spec: AnyRecord;
  data: AnyRecord;
  signature: string;
  renderStep(index: number, options?: AnyRecord): void;
  renderScrollProgress(index: number, progress: number, direction?: "up" | "down" | string): void;
  scrollDriver: AnyRecord;
  destroy(): void;
}>;
