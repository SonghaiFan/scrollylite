import { clamp } from './utils.js';
import type { ActionToken, ActionType, Direction, NormalizedActionEvent, RawActionEvent } from '../types/index.js';

export function hasScrollAction(stepOrAction: string[] | Element | Record<string, unknown> = {}): boolean {
  if (stepOrAction instanceof Element) {
    const actionAttr = (stepOrAction as HTMLElement).dataset?.action;
    return Boolean(actionAttr?.includes('scroll'));
  }
  const actions = Array.isArray(stepOrAction)
    ? stepOrAction
    : ((stepOrAction as Record<string, unknown>).action as string[] | undefined) ?? [];
  return actions.includes('scroll');
}

export function normalizeActionTokens(
  action: string | string[] = ['step', 'tooltip']
): ActionToken[] {
  const values = Array.isArray(action) ? action : [action];
  return uniqueActionTokens(
    values.flatMap((v): ActionToken[] => {
      if (v === 'stepper') return ['step', 'tooltip'];
      if (v === 'scroller') return ['scroll', 'tooltip'];
      return [v as ActionToken];
    })
  );
}

export function normalizeActionEvent(
  event: RawActionEvent,
  options: Record<string, unknown> = {},
  context: { activeIndex?: number; stepCount?: number } = {}
): NormalizedActionEvent {
  const source = normalizeEventSource(event);
  const type = (source.type ?? options.type ?? 'enter') as ActionType;
  const rawValue = firstDefined(
    source.value,
    source.progress,
    source.scrollProgress,
    options.value,
    options.progress,
    options.scrollProgress
  );
  const hasValue = rawValue != null && rawValue !== '';
  const isProgress = isProgressEvent(type) || Boolean(hasValue);
  const fallbackIndex =
    typeof context.activeIndex === 'number' && Number.isFinite(context.activeIndex) && context.activeIndex >= 0
      ? context.activeIndex
      : 0;
  const stepIndex = firstDefined(source.step, source.index, options.step, options.index, fallbackIndex);
  const index = clamp(Number(stepIndex) || 0, 0, Math.max(0, (context.stepCount ?? 1) - 1));
  const action = normalizeActionTokens(
    (source.action ?? options.action ?? (isProgress ? 'scroller' : 'stepper')) as string | string[]
  );

  return {
    type,
    index,
    value: clamp(Number(hasValue ? rawValue : defaultProgressForType(type, (source.direction ?? options.direction) as Direction | undefined)), 0, 1),
    direction: (source.direction ?? options.direction ?? 'down') as Direction,
    action,
    force: (source.force ?? options.force) as boolean | undefined,
    progress: isProgress
  };
}

export function defaultScrollProgress(direction: Direction): number {
  return direction === 'up' ? 1 : 0;
}

export function normalizeScrollAction(scrollSpec: true | Record<string, unknown> = {}): Record<string, unknown> {
  if (scrollSpec === true) return {};
  return { ease: 'linear', ...scrollSpec };
}

export function easeProgress(progress: number, name = 'linear', d3: Record<string, unknown>): number {
  if (!d3) {
    throw new Error('ScrollyLite scroll easing requires D3. Pass { d3 } to createStory().');
  }
  const eases: Record<string, ((t: number) => number) | undefined> = {
    linear: d3.easeLinear as (t: number) => number,
    cubic: d3.easeCubic as (t: number) => number,
    cubicInOut: d3.easeCubicInOut as (t: number) => number,
    cubicOut: d3.easeCubicOut as (t: number) => number
  };
  const ease = eases[name] ?? (d3.easeLinear as (t: number) => number);
  return clamp(ease(clamp(progress, 0, 1)), 0, 1);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

interface SourceEvent {
  type?: string;
  step?: number;
  index?: number;
  value?: number;
  progress?: number;
  scrollProgress?: number;
  direction?: string;
  action?: string | string[];
  force?: boolean;
}

function normalizeEventSource(event: RawActionEvent): SourceEvent {
  if (typeof event === 'number') return { type: 'progress', value: event };
  if (typeof event === 'string') return { type: event };
  if (!event || typeof event !== 'object') return {};

  const domEvent = event as Event & {
    step?: number;
    index?: number;
    value?: number;
    progress?: number;
    scrollProgress?: number;
    direction?: string;
    action?: string | string[];
    force?: boolean;
  };
  const target = domEvent.currentTarget ?? domEvent.target;
  if (target && typeof domEvent.type === 'string') {
    const el = target as HTMLInputElement & { dataset?: DOMStringMap };
    return {
      type: domEvent.type,
      step: domEvent.step ?? domEvent.index ??
        (el.dataset?.stepIndex ? Number(el.dataset.stepIndex) : undefined) ??
        (el.closest?.('[data-step-index]') as HTMLElement | null)?.dataset?.stepIndex
          ? Number((el.closest?.('[data-step-index]') as HTMLElement).dataset.stepIndex)
          : undefined,
      value: domEvent.value ?? domEvent.progress ?? targetValue(el),
      direction: domEvent.direction,
      action: domEvent.action,
      force: domEvent.force
    };
  }

  return event as SourceEvent;
}

function targetValue(target: HTMLInputElement & { dataset?: DOMStringMap }): number | undefined {
  if (!target) return undefined;
  if (typeof target.valueAsNumber === 'number' && Number.isFinite(target.valueAsNumber)) {
    return target.valueAsNumber;
  }
  if (target.type === 'range' || target.type === 'number') return Number(target.value);
  if (typeof target.value === 'string' && target.value.trim() !== '' && !Number.isNaN(Number(target.value))) {
    return Number(target.value);
  }
  return undefined;
}

function isProgressEvent(type: ActionType): boolean {
  return ['progress', 'scroll', 'input', 'scrub', 'slider'].includes(type);
}

function defaultProgressForType(type: ActionType, direction?: Direction): number {
  if (type === 'exit' || type === 'unclick') return 0;
  return defaultScrollProgress(direction ?? 'down');
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((v) => v !== undefined && v !== null);
}

function uniqueActionTokens(actions: ActionToken[]): ActionToken[] {
  return [...new Set(actions.filter(Boolean))];
}
