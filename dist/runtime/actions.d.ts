import type { ActionToken, Direction, NormalizedActionEvent, RawActionEvent } from '../types/index.js';
export declare function hasScrollAction(stepOrAction?: string[] | Element | Record<string, unknown>): boolean;
export declare function normalizeActionTokens(action?: string | string[]): ActionToken[];
export declare function normalizeActionEvent(event: RawActionEvent, options?: Record<string, unknown>, context?: {
    activeIndex?: number;
    stepCount?: number;
}): NormalizedActionEvent;
export declare function defaultScrollProgress(direction: Direction): number;
export declare function normalizeScrollAction(scrollSpec?: true | Record<string, unknown>): Record<string, unknown>;
export declare function easeProgress(progress: number, name: string | undefined, d3: Record<string, unknown>): number;
