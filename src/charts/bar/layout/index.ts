import type { BarLayout, BarOrientation, ChannelSpec } from '../../../types/index.js';

export function barOrientationFromEncoding(
  encoding: Record<string, ChannelSpec | undefined> = {}
): BarOrientation {
  return isQuantitative(encoding.x) && isDiscrete(encoding.y) ? 'horizontal' : 'vertical';
}

export function barCategoryChannelName(encoding: Record<string, ChannelSpec | undefined> = {}): 'x' | 'y' {
  return barOrientationFromEncoding(encoding) === 'horizontal' ? 'y' : 'x';
}

export function barMeasureChannelName(encoding: Record<string, ChannelSpec | undefined> = {}): 'x' | 'y' {
  return barOrientationFromEncoding(encoding) === 'horizontal' ? 'x' : 'y';
}

export function barCategoryChannel(encoding: Record<string, ChannelSpec | undefined> = {}): ChannelSpec {
  return encoding[barCategoryChannelName(encoding)] ?? {};
}

export function barMeasureChannel(encoding: Record<string, ChannelSpec | undefined> = {}): ChannelSpec {
  return encoding[barMeasureChannelName(encoding)] ?? {};
}

export function barOffsetChannelName(orientation: BarOrientation): 'xOffset' | 'yOffset' {
  return orientation === 'horizontal' ? 'yOffset' : 'xOffset';
}

export function barRendererKey(layout: BarLayout, orientation: BarOrientation): string {
  if (layout === 'grouped') return `grouped-${orientation}`;
  if (layout === 'stacked') return `stacked-${orientation}`;
  return orientation;
}

export interface LayoutTransitionRouteOptions {
  fromLayout: BarLayout | undefined;
  toLayout: BarLayout | undefined;
  change: 'collapse' | 'split';
}

export function barLayoutTransitionRoute({
  fromLayout,
  toLayout,
  change
}: LayoutTransitionRouteOptions): BarLayout[] {
  const from = barLayoutDefinition(fromLayout);
  const to = barLayoutDefinition(toLayout);
  const fromVia = from.transition?.[change]?.to?.[to.key]?.via ?? [];
  const toVia = to.transition?.[change]?.from?.[from.key]?.via ?? [];
  return [...fromVia, ...toVia];
}

export function isSegmentLayout(layout: BarLayout | undefined): boolean {
  return layout === 'grouped' || layout === 'stacked';
}

// ─── Internal ─────────────────────────────────────────────────────────────────

interface LayoutViaSpec {
  via: BarLayout[];
}

interface LayoutTransitionSide {
  to?: Record<string, LayoutViaSpec>;
  from?: Record<string, LayoutViaSpec>;
}

interface LayoutDefinition {
  key: BarLayout;
  transition?: {
    collapse?: LayoutTransitionSide;
    split?: LayoutTransitionSide;
  };
}

function barLayoutDefinition(layout: BarLayout | undefined): LayoutDefinition {
  return BAR_LAYOUTS[layout ?? 'simple'] ?? BAR_LAYOUTS.simple;
}

const BAR_LAYOUTS: Record<BarLayout, LayoutDefinition> = {
  simple: { key: 'simple' },
  stacked: { key: 'stacked' },
  grouped: {
    key: 'grouped',
    transition: {
      collapse: { to: { simple: { via: ['stacked'] } } },
      split: { from: { simple: { via: ['stacked'] } } }
    }
  }
};

function isQuantitative(channel: ChannelSpec | undefined): boolean {
  return channel?.type === 'quantitative';
}

function isDiscrete(channel: ChannelSpec | undefined): boolean {
  return channel?.type === 'nominal' || channel?.type === 'ordinal';
}
