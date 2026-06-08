type AnyRecord = Record<string, any>;
type Selector = AnyRecord;
type DataSource = string | AnyRecord | any[];
type Target = string | Element;

interface CreateStoryOptions {
  target?: Target;
  d3: any;
  aq?: any;
  debug?: boolean;
}

interface StoryRuntime {
  spec: AnyRecord;
  data: AnyRecord;
  signature: string;
  renderStep(index: number, options?: AnyRecord): void;
  renderScrollProgress(index: number, progress: number, direction?: "up" | "down" | string): void;
  scrollDriver: AnyRecord;
  destroy(): void;
}

interface StoryBuilder {
  schema(value: string): this;
  title(value: string): this;
  description(value: string): this;
  data(name: string, source: DataSource): this;
  data(datasets: Record<string, DataSource>): this;
  layout(preset: string, options?: AnyRecord): this;
  layout(config: AnyRecord): this;
  action(actions: string | string[]): this;
  view(config: AnyRecord): this;
  view(id: string, config: AnyRecord): this;
  step(definition: AnyRecord): this;
  step(title: string, view: ChartState | AnyRecord, options?: AnyRecord | string): this;
  steps(definitions?: AnyRecord[]): this;
  toSpec(): AnyRecord;
}

interface ChartState {
  toSpec(): AnyRecord;
  data(data: string): this;
  x(field: string | AnyRecord, options?: AnyRecord): this;
  y(field: string | AnyRecord, options?: AnyRecord | string): this;
  channel(name: string, field: string | AnyRecord, options?: AnyRecord): this;
  color(valueOrField: string | AnyRecord, options?: AnyRecord): this;
  size(field: string, options?: AnyRecord): this;
  key(fields: string | string[]): this;
  tooltip(items: string | AnyRecord | Array<string | AnyRecord>): this;
  sort(field: string, order?: "ascending" | "descending" | string): this;
  transition(timing: AnyRecord): this;
  filter(selector: Selector): this;
  where(selector: Selector | null): this;
  highlight(selector: Selector, options?: AnyRecord): this;
  guide(config?: AnyRecord): this;
}

interface BarState extends ChartState {
  flip(options?: AnyRecord): this;
  breakdown(segment?: string, options?: AnyRecord): this;
  rollup(groupby?: string | string[] | AnyRecord | null, options?: AnyRecord): this;
  segment(fieldOrConfig?: string | AnyRecord, config?: AnyRecord): this;
  layout(layout: string, options?: AnyRecord): this;
  stage(order: string | string[], options?: AnyRecord): this;
}

interface LineState extends ChartState {
  curve(value: string): this;
  strokeWidth(value: number): this;
  pointSize(value: number): this;
  flip(options?: AnyRecord): this;
  breakdown(field: string, options?: AnyRecord): this;
  rollup(groupbyOrOptions?: string | string[] | AnyRecord, options?: AnyRecord): this;
}

interface PointState extends ChartState {
  pointSize(value: number): this;
  radius(value: number): this;
  flip(options?: AnyRecord): this;
  rollup(groupby?: string | string[], options?: AnyRecord): this;
  breakdown(detail?: string | AnyRecord | null, options?: AnyRecord): this;
}

interface UnitState extends ChartState {
  value(field: string, options?: { maxUnits?: number } & AnyRecord): this;
  label(field: string): this;
  columns(value: number): this;
  radius(value: number): this;
  group(field: string, options?: AnyRecord): this;
  timeline(field: string, options?: AnyRecord): this;
  dodge(field: string, options?: AnyRecord): this;
}

interface ChartPluginConfig {
  key: string;
  createRenderer?: (deps?: AnyRecord) => any;
  createSpecCompiler?: (deps?: AnyRecord) => any;
  createIdiom?: (deps?: AnyRecord) => AnyRecord;
  scenes?: string[];
  stateOperations?: Record<string, string>;
  prepareSpec?: (spec: AnyRecord) => AnyRecord;
  transition?: {
    plan?: (...args: any[]) => AnyRecord;
    intermediateSpecs?: (...args: any[]) => AnyRecord[];
    intermediateSpec?: (...args: any[]) => AnyRecord;
  };
  defaults?: {
    margin?: (...args: any[]) => AnyRecord;
  };
  inspect?: AnyRecord;
}

interface ChartPlugin {
  key: string;
  scenes: string[];
  stateOperations: Record<string, string>;
  createChartIdiom(deps?: AnyRecord): AnyRecord;
  createSpecCompiler?: (deps?: AnyRecord) => any;
}

interface ChartModule {
  plugin: ChartPlugin;
}

export function createStory(spec: AnyRecord, options: CreateStoryOptions): Promise<StoryRuntime>;
export function story(initialSpec?: AnyRecord): StoryBuilder;
export function bar(data: string): BarState;
export function line(data: string): LineState;
export function point(data: string): PointState;
export function unit(data: string): UnitState;
export function defineChartIdiom(config: ChartPluginConfig): ChartPlugin;
export function registerChartIdiom(idiom: AnyRecord): void;
export function registerChartModule(module: ChartModule): void;
export function availableChartIdioms(): string[];
