import type { TimingDefaults, TransitionSpec } from './types/index.js';
export declare const DEFAULT_TIMING: TimingDefaults;
export declare function defaultTransition(overrides?: Partial<TransitionSpec>): Required<TransitionSpec>;
export declare function stagedDuration(totalDuration: number | undefined, stageCount: number): number;
