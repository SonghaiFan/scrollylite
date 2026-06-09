export function barOrientationFromEncoding(encoding?: {}): "horizontal" | "vertical";
export function barCategoryChannelName(encoding?: {}): "x" | "y";
export function barMeasureChannelName(encoding?: {}): "x" | "y";
export function barCategoryChannel(encoding?: {}): any;
export function barMeasureChannel(encoding?: {}): any;
export function barOffsetChannelName(orientation: any): "yOffset" | "xOffset";
export function barRendererKey(layout: any, orientation: any): any;
export function barLayoutTransitionRoute({ fromLayout, toLayout, change }: {
    fromLayout: any;
    toLayout: any;
    change: any;
}): any[];
export function isSegmentLayout(layout: any): boolean;
