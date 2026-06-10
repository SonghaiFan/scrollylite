import type { LayoutSpec, StepSpec, StorySpec, TransformSpec } from '../types/index.js';
import { dataName } from '../scrolly-meta.js';
import { normalizeScrollDriverConfig } from '../scroll-drivers/index.js';
import { uniqueTokens } from './utils.js';

type AnyRecord = Record<string, unknown>;

interface CompiledSpec extends StorySpec {
  data: Record<string, unknown>;
  views: Record<string, AnyRecord>;
  theme: AnyRecord;
  layout: LayoutSpec;
  steps: StepSpec[];
}

export function compileSpec(spec: Partial<StorySpec>): CompiledSpec {
  if (!spec || typeof spec !== 'object') {
    throw new Error('ScrollyLite requires a story spec object.');
  }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (!steps.length) {
    throw new Error('ScrollyLite spec must contain at least one step.');
  }

  const layout: LayoutSpec = {
    offset: 0.55,
    nav: true,
    progress: true,
    scroll: {},
    ...(spec.layout || {}),
    preset: (spec.layout as AnyRecord)?.['preset'] as string || 'floatToText'
  } as LayoutSpec;
  (layout as AnyRecord)['scroll'] = normalizeScrollDriverConfig((layout as AnyRecord)['scroll'] as AnyRecord || {});

  const normalizedSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || `step-${index + 1}`,
    transition: normalizeStepTransition(step.transition as AnyRecord | undefined),
    action: normalizeStepAction(step as AnyRecord, index),
    views: normalizeStepViews(step as AnyRecord)
  })) as StepSpec[];

  const viewData = collectViewDataSources(normalizedSteps);

  return {
    ...spec,
    data: { ...(spec.data || {} as AnyRecord), ...viewData.data },
    views: (spec.views || { main: {} }) as Record<string, AnyRecord>,
    theme: (spec.theme || {}) as AnyRecord,
    layout,
    steps: viewData.steps
  } as CompiledSpec;
}

export function storySignature(spec: StorySpec): Array<{ index: number; id: string; title: string; transition: string[]; action: string[] }> {
  return (spec.steps || []).map((step, index) => ({
    index,
    id: step.id!,
    title: step.title!,
    transition: ((step.transition as AnyRecord)?.['scene'] as string[]) || [],
    action: (step as AnyRecord)['action'] as string[] || []
  }));
}

export async function loadData(dataSpec: Record<string, unknown>, d3: AnyRecord): Promise<Record<string, unknown[]>> {
  if (!d3) {
    throw new Error('ScrollyLite data loading requires D3. Pass { d3 } to createStory().');
  }
  const entries = await Promise.all(
    Object.entries(dataSpec).map(async ([name, source]) => {
      if (Array.isArray(source)) return [name, source];
      const src = source as AnyRecord;
      if (Array.isArray(src['values'])) return [name, src['values']];
      if (!src['url']) return [name, []];

      if ((src['type'] || 'csv') === 'csv') {
        const rows = await (d3['csv'] as (url: string, fn: unknown) => Promise<unknown[]>)(src['url'] as string, d3['autoType']);
        return [name, rows];
      }

      if (src['type'] === 'json') {
        const rows = await (d3['json'] as (url: string) => Promise<unknown>)(src['url'] as string);
        return [name, Array.isArray(rows) ? rows : (rows as AnyRecord)['values'] || []];
      }

      throw new Error(`Unsupported data type for "${name}": ${src['type']}`);
    })
  );
  return Object.fromEntries(entries) as Record<string, unknown[]>;
}

export function viewRows(
  dataSpec: unknown,
  datasets: Record<string, unknown[]>
): unknown[] {
  if (Array.isArray(dataSpec)) return dataSpec;
  if (Array.isArray((dataSpec as AnyRecord)?.['values'])) return (dataSpec as AnyRecord)['values'] as unknown[];
  const name = dataName(dataSpec);
  return name ? (datasets[name] || []) : [];
}

export function domainTransforms(transforms: TransformSpec[] = []): TransformSpec[] {
  return transforms.filter((transform) => {
    const t = transform as AnyRecord;
    return !t['filter'] && !t['limit'];
  });
}

function normalizeStepTransition(transition: AnyRecord = {}): { scene: string[] } {
  return { scene: uniqueTokens((transition['scene'] as unknown[]) || []) };
}

function normalizeStepAction(step: AnyRecord = {}, index = 0): string[] {
  const fallback = index === 0 ? ['step', 'tooltip', 'enter'] : ['step', 'tooltip'];
  const action = step['action'] as unknown[] | undefined;
  return uniqueTokens(action?.length ? action : fallback);
}

function normalizeStepViews(step: AnyRecord): Record<string, unknown> {
  if (step['views']) return step['views'] as Record<string, unknown>;
  if (step['view']) return { main: step['view'] };
  return {};
}

function collectViewDataSources(steps: StepSpec[]): { data: Record<string, unknown>; steps: StepSpec[] } {
  const data: Record<string, unknown> = {};
  // Deduplicate: same URL → same generated name, loaded only once
  const urlToName = new Map<string, string>();

  const normalizedSteps = steps.map((step, stepIndex) => ({
    ...step,
    views: Object.fromEntries(
      Object.entries((step as AnyRecord)['views'] as Record<string, AnyRecord> || {}).map(([viewId, viewSpec]) => {
        if (!(viewSpec?.['data'] as AnyRecord)?.['url']) return [viewId, viewSpec];

        const url = (viewSpec['data'] as AnyRecord)['url'] as string;
        const explicitName = (viewSpec['data'] as AnyRecord)['name'] as string | undefined;

        let name: string;
        if (explicitName) {
          name = explicitName;
        } else if (urlToName.has(url)) {
          name = urlToName.get(url)!;          // reuse existing name for same URL
        } else {
          name = `__data_${stepIndex + 1}_${viewId}`;
          urlToName.set(url, name);
        }

        data[name] = normalizeUrlDataSource(viewSpec['data'] as AnyRecord);
        return [viewId, { ...viewSpec, data: { name } }];
      })
    )
  })) as StepSpec[];
  return { data, steps: normalizedSteps };
}

function normalizeUrlDataSource(dataSpec: AnyRecord): AnyRecord {
  return {
    ...dataSpec,
    type: dataSpec['type'] || (dataSpec['format'] as AnyRecord | undefined)?.['type'] || dataTypeFromUrl(dataSpec['url'] as string)
  };
}

function dataTypeFromUrl(url = ''): string {
  return String(url).toLowerCase().endsWith('.json') ? 'json' : 'csv';
}
