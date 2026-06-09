export function createNativeScrollDriver({ steps, offset, config, onEnter, onExit, onProgress, isLocked }?: {
    steps?: any[];
    offset?: number;
    config?: {};
    onEnter?: () => void;
    onExit?: () => void;
    onProgress?: () => void;
    isLocked?: () => boolean;
}): {
    type: string;
    resize: () => void;
    refresh: () => void;
    scrollToStep(index: any, options?: {}): number;
    destroy(): void;
};
export function scrollToStepElement(step: any, { offset, progress, behavior }?: {
    offset?: number;
    progress?: number;
    behavior?: string;
}): number;
export function measureStepProgress(steps: any, offset?: number, config?: {}): {
    index: number;
    progress: number;
};
export function isAtDocumentBottom(): boolean;
