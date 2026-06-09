export function installTransitionProgress(d3: any): void;
export function createSceneTransitionProgress(scene: any, options?: {}): {
    items: any[];
    progress(value: any): void;
    destroy({ finish }?: {
        finish?: boolean;
    }): void;
};
export function clearSceneTransitionProgress(scene: any, { finish }?: {
    finish?: boolean;
}): void;
export const SCROLL_TRANSITION_NAME: "__scrollyLiteScroll";
