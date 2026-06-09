import type { LayoutSpec } from '../types/index.js';
interface LayoutPreset {
    name: string;
    classes: string[];
}
export declare function registerLayout(name: string, preset: Partial<LayoutPreset>): void;
export declare function resolveLayout(layout?: Partial<LayoutSpec>): LayoutPreset | undefined;
export declare function layoutClasses(layout?: Partial<LayoutSpec>): string[];
export declare function availableLayouts(): string[];
export {};
