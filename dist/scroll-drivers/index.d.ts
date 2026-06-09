export interface ScrollConfig {
    progress?: string;
    start?: number | null;
    end?: number | null;
    clamp?: boolean;
    snap?: {
        enabled?: boolean;
        mode?: string;
        target?: string;
    };
    navigation?: {
        behavior?: string;
        lock?: boolean;
        progress?: number;
    };
}
export interface ScrollEvent {
    index: number;
    direction?: string;
    progress?: number;
    element?: Element;
}
export interface ScrollDriverOptions {
    config?: ScrollConfig | boolean | string;
    steps?: Element[];
    offset?: number;
    threshold?: number;
    onEnter?: (event: ScrollEvent) => void;
    onExit?: (event: ScrollEvent) => void;
    onProgress?: (event: ScrollEvent) => void;
    isLocked?: () => boolean;
    [key: string]: unknown;
}
export declare function createScrollDriver(options?: ScrollDriverOptions): unknown;
export declare function normalizeScrollDriverConfig(config?: ScrollConfig | boolean | string): ScrollConfig;
