import type { LayoutSpec, StepSpec, StorySpec, TransformSpec } from '../types/index.js';
type AnyRecord = Record<string, unknown>;
interface CompiledSpec extends StorySpec {
    data: Record<string, unknown>;
    views: Record<string, AnyRecord>;
    theme: AnyRecord;
    layout: LayoutSpec;
    steps: StepSpec[];
}
export declare function compileSpec(spec: Partial<StorySpec>): CompiledSpec;
export declare function storySignature(spec: StorySpec): Array<{
    index: number;
    id: string;
    title: string;
    transition: string[];
    action: string[];
}>;
export declare function loadData(dataSpec: Record<string, unknown>, d3: AnyRecord): Promise<Record<string, unknown[]>>;
export declare function viewRows(dataSpec: unknown, datasets: Record<string, unknown[]>): unknown[];
export declare function domainTransforms(transforms?: TransformSpec[]): TransformSpec[];
export {};
