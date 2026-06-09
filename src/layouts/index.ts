import type { LayoutSpec } from '../types/index.js';

interface LayoutPreset {
  name: string;
  classes: string[];
}

const layoutRegistry = new Map<string, LayoutPreset>();

export function registerLayout(name: string, preset: Partial<LayoutPreset>): void {
  const key = normalizeLayoutName(name);
  if (!key) throw new Error('Layout name is required.');
  layoutRegistry.set(key, {
    classes: [],
    ...preset,
    name: key
  });
}

export function resolveLayout(layout: Partial<LayoutSpec> = {}): LayoutPreset | undefined {
  const requested = (layout as Record<string, unknown>)['preset'] as string | undefined
    || (layout as Record<string, unknown>)['name'] as string | undefined;
  if (requested) {
    return layoutRegistry.get(normalizeLayoutName(requested)) ?? layoutRegistry.get('floatToText');
  }
  return layoutRegistry.get('floatToText');
}

export function layoutClasses(layout: Partial<LayoutSpec> = {}): string[] {
  return resolveLayout(layout)?.classes ?? [];
}

export function availableLayouts(): string[] {
  return Array.from(layoutRegistry.keys()).sort();
}

function normalizeLayoutName(name: string): string {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/[\s_-]+([a-z])/gi, (_, letter: string) => letter.toUpperCase());
  return compact.charAt(0).toLowerCase() + compact.slice(1);
}

registerLayout('floatToText', { classes: ['sl-layout-preset-float-to-text'] });
registerLayout('textOverVis', { classes: ['sl-layout-preset-text-over-vis'] });
