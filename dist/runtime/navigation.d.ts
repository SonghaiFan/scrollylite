interface ShellStoryElement extends HTMLElement {
    __scrollyLiteScrollDriver?: ScrollDriver;
    __scrollyLiteNavTimers?: ReturnType<typeof setTimeout>[];
    __scrollyLiteNavCleanups?: (() => void)[];
}
interface Shell {
    story: ShellStoryElement;
    steps: HTMLElement[];
    navButtons: HTMLElement[];
}
interface Renderer {
    action(event: Record<string, unknown>): void;
    resize(): void;
    cancelScrollProgress?(): void;
}
interface ScrollDriver {
    resize?(): void;
    scrollToStep?(index: number): number | null;
    refresh?(): void;
}
export declare function setupScroll(spec: {
    layout: {
        offset?: number;
        threshold?: number;
        scroll?: unknown;
    };
}, shell: Shell, renderer: Renderer): ScrollDriver;
export declare function setupNav(shell: Shell, renderer: Renderer, scrollDriver: ScrollDriver): void;
export declare function setupResize(renderer: Renderer, scrollDriver: ScrollDriver): () => void;
export declare function restoreHashPosition(shell: Shell, renderer: Renderer, scrollDriver: ScrollDriver): void;
export {};
