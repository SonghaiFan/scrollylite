export declare const SCROLL_TRANSITION_NAME = "__scrollyLiteScroll";
export declare function installTransitionProgress(d3: any): void;
export declare function createSceneTransitionProgress(scene: any, options?: {}): {
    items: any[];
    progress(value: any): void;
    destroy({ finish }?: {
        finish?: boolean | undefined;
    }): void;
};
export declare function clearSceneTransitionProgress(scene: any, { finish }?: {
    finish?: boolean | undefined;
}): void;
