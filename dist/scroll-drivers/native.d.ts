interface ScrollConfig {
    clamp?: boolean;
    navigation?: {
        behavior?: string;
        lock?: boolean;
        progress?: number;
    };
}
interface StepProgressState {
    index: number;
    progress: number;
}
interface ScrollDriverEvent {
    element: Element;
    index: number;
    direction?: string;
    progress?: number;
}
interface NativeScrollDriver {
    type: 'native';
    resize(): void;
    refresh(): void;
    scrollToStep(index: number, options?: {
        progress?: number;
        behavior?: string;
    }): number | null;
    destroy(): void;
}
interface ScrollDriverOptions {
    steps?: Element[];
    offset?: number;
    config?: ScrollConfig;
    onEnter?: (event: ScrollDriverEvent) => void;
    onExit?: (event: ScrollDriverEvent) => void;
    onProgress?: (event: ScrollDriverEvent & {
        progress: number;
    }) => void;
    isLocked?: () => boolean;
}
export declare function createNativeScrollDriver({ steps, offset, config, onEnter, onExit, onProgress, isLocked }?: ScrollDriverOptions): NativeScrollDriver;
export declare function scrollToStepElement(step: Element, { offset, progress, behavior }?: {
    offset?: number;
    progress?: number;
    behavior?: string;
}): number;
export declare function measureStepProgress(steps: Element[], offset?: number, config?: ScrollConfig): StepProgressState | null;
export declare function isAtDocumentBottom(): boolean;
export {};
