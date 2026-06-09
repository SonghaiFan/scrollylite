// ─── Channel & Encoding ──────────────────────────────────────────────────────

export type ChannelType = 'quantitative' | 'temporal' | 'nominal' | 'ordinal';
export type SortOrder = 'ascending' | 'descending';

export interface SortSpec {
  field?: string;
  order?: SortOrder;
  op?: string;
}

export interface ChannelSpec {
  field?: string;
  type?: ChannelType;
  title?: string;
  aggregate?: string | boolean;
  timeUnit?: string;
  value?: string;
  sort?: SortOrder | SortSpec;
  domain?: unknown[];
  scale?: Record<string, unknown>;
  bin?: boolean | Record<string, unknown>;
  [key: string]: unknown;
}

export interface EncodingSpec {
  x?: ChannelSpec;
  y?: ChannelSpec;
  color?: ChannelSpec;
  size?: ChannelSpec;
  xOffset?: ChannelSpec;
  yOffset?: ChannelSpec;
  tooltip?: ChannelSpec | ChannelSpec[];
  key?: ChannelSpec;
  [channel: string]: ChannelSpec | ChannelSpec[] | undefined;
}

// ─── Transforms & Filters ────────────────────────────────────────────────────

export interface FilterSpec {
  field: string;
  equal?: unknown;
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
  oneOf?: unknown[];
  [key: string]: unknown;
}

export interface AggregateFieldSpec {
  op: string;
  field?: string;
  as: string;
}

export interface AggregateTransform {
  groupby: string[];
  fields: AggregateFieldSpec[];
}

export interface TimeUnitTransform {
  field: string;
  unit: string;
  as: string;
}

export type TransformSpec =
  | { filter: FilterSpec; [key: string]: unknown }
  | { aggregate: AggregateTransform; [key: string]: unknown }
  | { sort: SortSpec & { field: string }; [key: string]: unknown }
  | { timeUnit: TimeUnitTransform; [key: string]: unknown }
  | Record<string, unknown>;

// ─── Timing ──────────────────────────────────────────────────────────────────

export interface StaggerSpec {
  step?: number;
  max?: number;
}

export interface TransitionSpec {
  duration?: number;
  ease?: string;
  stagger?: StaggerSpec | number;
}

export interface StageSpec {
  order?: Array<'x' | 'y'>;
  duration?: number;
  stagger?: StaggerSpec;
}

export interface TimingDefaults {
  transition: Required<TransitionSpec> & { stagger: StaggerSpec };
  scene: { stagger: StaggerSpec };
  stage: { minDuration: number };
  unit: {
    axisDurationMultiplier: number;
    xRatio: number;
    stagger: StaggerSpec;
    xStagger: StaggerSpec;
  };
}

// ─── Layout & Margin ─────────────────────────────────────────────────────────

export interface MarginSpec {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ─── Focus / Guide / Granularity ─────────────────────────────────────────────

export interface FocusSpec {
  field?: string;
  equal?: unknown;
  mode?: 'highlight' | 'filter';
  filter?: FilterSpec;
  opacity?: number;
  [key: string]: unknown;
}

export interface GuideSpec {
  flip?: boolean;
  layout?: BarLayout;
  orientation?: BarOrientation;
  xScale?: string;
  yScale?: string;
  staging?: StageSpec;
  scale?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GranularitySpec {
  category?: string | null;
  categoryTitle?: string;
  categoryField?: string | null;
  fields?: string[];
  labels?: Record<string, string>;
  segment?: string;
  segmentField?: string | null;
  value?: string;
  valueTitle?: string;
  valueField?: string | null;
  layout?: BarLayout;
  color?: ChannelSpec;
  domain?: unknown[];
  range?: unknown[];
  source?: string;
  groupby?: string[];
  op?: string;
  [key: string]: unknown;
}

// ─── Semantic Key ─────────────────────────────────────────────────────────────

export interface SemanticKeyPart {
  field?: string;
  value?: unknown;
}

export type SemanticKeyPartInput = string | SemanticKeyPart | Array<string | SemanticKeyPart>;

export interface SemanticKey {
  entity?: SemanticKeyPartInput;
  entities?: SemanticKeyPartInput;
  measure?: SemanticKeyPartInput;
  measures?: SemanticKeyPartInput;
}

// ─── Narrative (internal wire format) ────────────────────────────────────────

export interface NarrativeObjectSpec {
  key?: string | string[] | null;
  semantic?: Record<string, unknown>;
}

export interface NarrativeSceneState {
  focus?: FocusSpec;
  guide?: GuideSpec;
  granularity?: GranularitySpec;
  [key: string]: unknown;
}

export interface NarrativeStateSpec {
  focus?: FocusSpec | null;
  guide?: GuideSpec | null;
  granularity?: GranularitySpec | null;
  sceneState?: NarrativeSceneState;
}

export interface NarrativeSpec {
  object?: NarrativeObjectSpec;
  state?: NarrativeStateSpec;
  transition?: TransitionSpec;
  transform?: TransformSpec[];
  action?: { scroll?: ScrollSpec };
  unit?: Record<string, unknown>;
  annotation?: { title?: string; description?: string };
  [key: string]: unknown;
}

export interface ResolvedNarrativeState {
  focus: FocusSpec | null;
  guide: GuideSpec | null;
  granularity: GranularitySpec | null;
  sceneState: NarrativeSceneState;
}

// ─── View Spec ────────────────────────────────────────────────────────────────

export type Mark = 'bar' | 'line' | 'point' | 'unit' | (string & {});
export type ScrollSpec = true | { ease?: string; [key: string]: unknown };

export interface ViewSpec {
  mark?: Mark;
  data?: string | { name: string } | Record<string, unknown>;
  encoding?: EncodingSpec;
  transform?: TransformSpec[];
  filter?: FilterSpec;
  key?: string | string[] | null;
  semanticKey?: SemanticKey | null;
  transition?: TransitionSpec;
  scroll?: ScrollSpec;
  guide?: GuideSpec | null;
  granularity?: GranularitySpec | null;
  focus?: FocusSpec | null;
  unit?: Record<string, unknown> | null;
  narrative?: NarrativeSpec;
  margin?: Partial<MarginSpec>;
  [field: string]: unknown;
}

// ─── Story ───────────────────────────────────────────────────────────────────

export type StepActionAlias = 'stepper' | 'scroller';
export type StepActionToken = 'step' | 'scroll' | 'tooltip' | 'enter';
export type StepActionInput = StepActionToken | StepActionAlias | string;

export interface StepDefinition {
  title?: string;
  body?: string;
  view?: ViewSpec | { toSpec(): ViewSpec };
  action?: StepActionInput | StepActionInput[];
  authoringCode?: string;
  authoring?: string;
  code?: string;
}

export interface StepSpec {
  id?: string;
  title?: string;
  body?: string;
  transition?: { scene: string[] };
  action?: StepActionToken[];
  views?: Record<string, ViewSpec>;
  inspector?: { authoringCode: string };
}

export interface LayoutSpec {
  preset?: string;
  [key: string]: unknown;
}

export interface ThemeSpec {
  href?: string;
  [key: string]: unknown;
}

export interface StorySpec {
  $schema?: string;
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  layout?: LayoutSpec;
  theme?: ThemeSpec;
  views?: Record<string, ViewSpec>;
  steps?: StepSpec[];
}

// ─── Bar-specific ─────────────────────────────────────────────────────────────

export type BarLayout = 'simple' | 'grouped' | 'stacked';
export type BarOrientation = 'vertical' | 'horizontal';

export interface ChannelSignature {
  field: string | null;
  title: string | null;
  type: string | null;
  aggregate: string | null;
  domain: unknown[] | null;
  scale: Record<string, unknown> | null;
  sort: unknown | null;
  bin: unknown | null;
}

export interface BarGeometryRole {
  role: 'category' | 'measure';
  field: string | null;
  filters?: FilterSpec[];
}

export interface BarGeometrySegment {
  field: string;
  color: ChannelSignature;
}

export interface BarGeometryState {
  orientation: BarOrientation;
  layout: BarLayout;
  category?: BarGeometryRole;
  measure?: BarGeometryRole;
  segment?: BarGeometrySegment | null;
  channel: ChannelSignature;
}

export interface BarSemanticState {
  orientation: BarOrientation;
  layout: BarLayout;
  categoryField: string | null;
  measureField: string | null;
  guide: GuideSpec | null;
  granularity: GranularitySpec | null;
  aggregate: AggregateTransform | AggregateTransform[] | null;
  segmentField: string | null;
  xGeometry: BarGeometryState;
  yGeometry: BarGeometryState;
}

// ─── Grammar internal ─────────────────────────────────────────────────────────

export interface GrammarMeta {
  operations?: string[];
  lastWhere?: { selectors: FilterSpec[]; fields: string[] };
  measureSelector?: { title: string; fields: string[] } | null;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

export type DeltaAction = 'add' | 'remove' | 'change';

export interface Delta<T = unknown> {
  type: string;
  action: DeltaAction;
  previous: T | null;
  next: T | null;
}

export interface SemanticViewState {
  mark: string | null;
  key: string | string[] | null;
  semanticKey: SemanticKey | null;
  encoding: EncodingSpec;
  filters: FilterSpec[];
  nonFilterTransforms: TransformSpec[];
  focus: FocusSpec | null;
  guide: GuideSpec | null;
  granularity: GranularitySpec | null;
  bar?: BarSemanticState;
}

export interface SemanticDiffResult {
  previous: SemanticViewState;
  next: SemanticViewState;
  deltas: Delta[];
  has(type: string, action?: DeltaAction | null): boolean;
  get<T = unknown>(type: string): Delta<T> | null;
}

export interface DiffResult {
  changed: string[];
  has(key: string): boolean;
  deltas: Delta[];
  delta<T = unknown>(type: string): Delta<T> | null;
  hasDelta(type: string, action?: DeltaAction | null): boolean;
  semantic: SemanticDiffResult;
  previous: SemanticViewState;
  next: SemanticViewState;
}

// ─── Transition planning ──────────────────────────────────────────────────────

export interface TransitionPlanKey {
  mode: string;
  reason: string;
}

export interface TransitionPlanStage {
  axis: 'x' | 'y';
  attrs: string[];
}

export interface TransitionPlanUpdate {
  mode: string;
  reason: string;
  target: { orientation: BarOrientation; layout: BarLayout; renderer: string };
  changedAxes: Array<'x' | 'y'>;
  stages: TransitionPlanStage[];
  timing: TransitionSpec;
  totalDuration: number;
}

export interface TransitionPlanBaseline {
  name: string;
  anchor?: string;
  value?: number;
  meaning: string;
}

export interface TransitionPlanEnterExit {
  mode: string;
  reason: string;
  from?: string;
  to?: string;
  target?: string;
  source?: string;
  baseline?: TransitionPlanBaseline;
  parentKey?: string | null;
  childKey?: Array<string | null>;
  targetLayout?: BarLayout;
  sourceLayout?: BarLayout;
  sourceOrientation?: BarOrientation;
  categoryKey?: string | null;
  segmentKey?: string | null;
  valueKey?: string | null;
}

export interface TransitionPlanDiffEntry {
  type: string;
  action: DeltaAction;
  previous: unknown;
  next: unknown;
}

export interface TransitionPlan {
  diff?: TransitionPlanDiffEntry[];
  key?: TransitionPlanKey;
  update?: TransitionPlanUpdate;
  enter?: TransitionPlanEnterExit;
  exit?: TransitionPlanEnterExit;
}

// ─── Chart idiom ──────────────────────────────────────────────────────────────

export type DataRow = Record<string, unknown>;

export interface ChartContext {
  g: unknown;
  scene: unknown;
  transition: unknown;
  transitionPlan?: TransitionPlan;
  scales?: unknown;
  channels?: EncodingSpec;
  position?: unknown;
  [key: string]: unknown;
}

export interface TooltipContext {
  show(content: string | HTMLElement, options?: Record<string, unknown>): void;
  hide(): void;
  [key: string]: unknown;
}

export type D3Lib = Record<string, unknown>;

export type Renderer<S extends ViewSpec = ViewSpec> = (
  chart: ChartContext,
  rows: DataRow[],
  spec: S,
  tooltip: TooltipContext,
  d3: D3Lib
) => void;

export type StateOperations = Record<string, string>;

export interface IntermediateSpec<S extends ViewSpec = ViewSpec> {
  spec: S;
  scene: string;
}

export interface CompilerContext {
  [key: string]: unknown;
}

export interface SpecCompiler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base(spec: ViewSpec, context: Record<string, unknown>): ViewSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operations: Record<string, (spec: ViewSpec, operationSpec: any, context: Record<string, unknown>) => ViewSpec>;
}

export interface ChartDeps {
  drawGrid?: (chart: ChartContext, scale: unknown, d3: D3Lib) => void;
  drawXAxis?: (chart: ChartContext, scale: unknown, title: string | undefined, d3: D3Lib) => void;
  drawYAxis?: (chart: ChartContext, scale: unknown, title: string | undefined, d3: D3Lib) => void;
  drawLegend?: (chart: ChartContext, rows: DataRow[], colorSpec: ChannelSpec | undefined, d3: D3Lib) => void;
  fadeNonBarShapes?: (chart: ChartContext) => void;
  [key: string]: unknown;
}

export interface ChartIdiom<S extends ViewSpec = ViewSpec> {
  key: string;
  renderer: Renderer<S>;
  prepareSpec(spec: S): S;
  resolveTransitionPlan(prev: S | null, next: S | null): TransitionPlan;
  intermediateSpecs?(prev: S, next: S): IntermediateSpec<S>[];
  intermediateSpec?(prev: S, next: S): IntermediateSpec<S> | null;
  defaultMargin(spec: S): Partial<MarginSpec>;
  readonly scenes: readonly string[];
  readonly stateOperations: StateOperations;
  inspect?: Record<string, unknown>;
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

export interface ChartPlugin<S extends ViewSpec = ViewSpec> {
  key: string;
  readonly scenes: readonly string[];
  readonly stateOperations: StateOperations;
  createChartIdiom(deps: ChartDeps): ChartIdiom<S>;
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

// ─── Actions & Events ─────────────────────────────────────────────────────────

export type ActionType =
  | 'enter' | 'exit' | 'step' | 'scroll' | 'progress'
  | 'tooltip' | 'input' | 'scrub' | 'click' | 'unclick'
  | (string & {});

export type Direction = 'up' | 'down' | (string & {});
export type ActionToken = 'step' | 'scroll' | 'tooltip' | 'enter' | (string & {});

export type RawActionEvent =
  | number
  | string
  | Event
  | {
      type?: string;
      step?: number;
      index?: number;
      value?: number;
      progress?: number;
      scrollProgress?: number;
      direction?: Direction;
      action?: ActionToken | ActionToken[];
      force?: boolean;
    };

export interface NormalizedActionEvent {
  type: ActionType;
  index: number;
  value: number;
  direction: Direction;
  action: ActionToken[];
  force?: boolean;
  progress: boolean;
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

export type Target = string | Element;

export interface RuntimeOptions {
  target?: Target;
  d3: D3Lib;
  aq?: Record<string, unknown>;
  debug?: boolean;
}

export interface PageOptions {
  target?: Target;
  debug?: boolean;
}

export interface ChartOptions extends RuntimeOptions {
  view?: string;
  viewId?: string;
  initialStep?: number;
}

export interface StoryRuntime {
  spec: StorySpec;
  data: Record<string, unknown>;
  signature: Record<string, unknown>[];
  action(event: RawActionEvent, options?: Record<string, unknown>): void;
  scrollDriver: Record<string, unknown>;
  destroy(): void;
}

export interface PageRuntime {
  spec: StorySpec;
  shell: Record<string, unknown>;
  root: Element;
  story: Element;
  steps: Element[];
  views: Record<string, Element>;
  tooltip: Element;
  destroy(): void;
}

export interface ChartRuntime {
  spec: StorySpec;
  data: Record<string, unknown>;
  view: Element;
  tooltip: Element;
  action(event: RawActionEvent, options?: Record<string, unknown>): void;
  resize(): void;
  destroy(): void;
}
