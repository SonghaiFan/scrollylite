export function createPointSpecCompiler(context?: {}): {
    base: typeof compilePointBase;
    operations: {
        filter: typeof compileFilter;
        highlight: typeof compileHighlight;
        coordinate: typeof compilePointCoordinate;
        scale: typeof compilePointScale;
        aggregate: typeof compilePointAggregate;
        layout: typeof compilePointLayout;
    };
};
declare function compilePointBase(spec: any, context?: {}): any;
import { compileFilter } from "../compiler-utils.js";
import { compileHighlight } from "../compiler-utils.js";
declare function compilePointCoordinate(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
declare function compilePointScale(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
declare function compilePointAggregate(spec: any, granularitySpec?: {}, context?: {}): {
    narrative: any;
};
declare function compilePointLayout(spec: any, operationSpec?: {}, context?: {}): any;
export {};
