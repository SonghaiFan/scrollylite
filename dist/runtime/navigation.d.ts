export declare function setupScroll(spec: any, shell: any, renderer: any): {
    type: string;
    resize: () => void;
    refresh: () => void;
    scrollToStep(index: any, options?: {}): number;
    destroy(): void;
};
export declare function setupNav(shell: any, renderer: any, scrollDriver: any): void;
export declare function setupResize(renderer: any, scrollDriver: any): () => void;
export declare function restoreHashPosition(shell: any, renderer: any, scrollDriver: any): void;
