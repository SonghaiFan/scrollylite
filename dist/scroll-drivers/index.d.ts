export function createScrollDriver(options?: {}): {
    type: string;
    resize: () => void;
    refresh: () => void;
    scrollToStep(index: any, options?: {}): number;
    destroy(): void;
};
export function normalizeScrollDriverConfig(config?: {}): {
    snap: any;
    navigation: any;
    progress: string;
    start: any;
    end: any;
    clamp: boolean;
};
