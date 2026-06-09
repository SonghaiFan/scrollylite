export function createLineSpecCompiler(context?: {}): {
    base: typeof compileLineBase;
    operations: {
        filter: typeof compileLineFilter;
        highlight: typeof compileHighlight;
        coordinate: typeof compileLineCoordinate;
        scale: typeof compileLineScale;
        aggregate: typeof compileLineAggregate;
        layout: typeof compileLineLayout;
        series: typeof compileLineSeries;
    };
};
declare function compileLineBase(spec: any, context?: {}): any;
declare function compileLineFilter(spec: any, focusSpec?: {}, context?: {}): any;
import { compileHighlight } from "../compiler-utils.js";
declare function compileLineCoordinate(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
declare function compileLineScale(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
declare function compileLineAggregate(spec: any, granularitySpec?: {}, context?: {}): {
    narrative: any;
};
declare function compileLineLayout(spec: any, operationSpec?: {}, context?: {}): any;
declare function compileLineSeries(spec: any, granularitySpec?: {}, context?: {}): {
    narrative: any;
};
export {};
