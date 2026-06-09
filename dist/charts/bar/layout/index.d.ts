import type { BarLayout, BarOrientation, ChannelSpec } from '../../../types/index.js';
export declare function barOrientationFromEncoding(encoding?: Record<string, ChannelSpec | undefined>): BarOrientation;
export declare function barCategoryChannelName(encoding?: Record<string, ChannelSpec | undefined>): 'x' | 'y';
export declare function barMeasureChannelName(encoding?: Record<string, ChannelSpec | undefined>): 'x' | 'y';
export declare function barCategoryChannel(encoding?: Record<string, ChannelSpec | undefined>): ChannelSpec;
export declare function barMeasureChannel(encoding?: Record<string, ChannelSpec | undefined>): ChannelSpec;
export declare function barOffsetChannelName(orientation: BarOrientation): 'xOffset' | 'yOffset';
export declare function barRendererKey(layout: BarLayout, orientation: BarOrientation): string;
export interface LayoutTransitionRouteOptions {
    fromLayout: BarLayout | undefined;
    toLayout: BarLayout | undefined;
    change: 'collapse' | 'split';
}
export declare function barLayoutTransitionRoute({ fromLayout, toLayout, change }: LayoutTransitionRouteOptions): BarLayout[];
export declare function isSegmentLayout(layout: BarLayout | undefined): boolean;
