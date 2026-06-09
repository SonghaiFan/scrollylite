export function createUnitSpecCompiler(context?: {}): {
    base: typeof compileUnitBase;
    operations: {
        filter: typeof compileFilter;
        highlight: typeof compileHighlight;
        layout: typeof compileUnitLayout;
        unitLayout: typeof compileUnitLayout;
        encode: typeof compileUnitEncoding;
    };
};
declare function compileUnitBase(spec: any, context?: {}): any;
import { compileFilter } from "../compiler-utils.js";
import { compileHighlight } from "../compiler-utils.js";
declare function compileUnitLayout(spec: any, guideSpec?: {}, context?: {}): {
    narrative: any;
};
declare function compileUnitEncoding(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
export {};
