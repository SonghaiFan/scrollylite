export function createBarSpecCompiler(context?: {}): {
    base: typeof compileBarBase;
    operations: {
        filter: typeof compileFilter;
        highlight: typeof compileHighlight;
        coordinate: typeof compileBarCoordinate;
        scale: typeof compileBarScale;
        aggregate: typeof compileBarAggregate;
        layout: typeof compileBarLayout;
    };
};
declare function compileBarBase(spec: any, context?: {}): any;
import { compileFilter } from "../compiler-utils.js";
import { compileHighlight } from "../compiler-utils.js";
declare function compileBarCoordinate(spec: any, guideSpec?: {}, context?: {}): any;
declare function compileBarScale(spec: any, operationSpec?: {}, context?: {}): any;
declare function compileBarAggregate(spec: any, granularitySpec?: {}, context?: {}): {
    narrative: any;
};
declare function compileBarLayout(spec: any, operationSpec?: {}, context?: {}): any;
export {};
