import type { Delta, SemanticViewState } from '../../types/index.js';
import { semanticBarState } from './semantic.js';
export { semanticBarState };
type PushDeltaFn = <T>(deltas: Delta[], type: string, previous: T | null | undefined, next: T | null | undefined) => void;
interface DiffHelpers {
    pushDelta: PushDeltaFn;
    pushStateDelta: PushDeltaFn;
}
export declare function appendBarSemanticDeltas(deltas: Delta[], previous: Partial<SemanticViewState>, next: Partial<SemanticViewState>, { pushDelta, pushStateDelta }: DiffHelpers): void;
