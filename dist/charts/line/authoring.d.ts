export function line(data: any): LineState;
export class LineState extends IdiomState {
    curve(value: any): any;
    strokeWidth(value: any): any;
    pointSize(value: any): any;
    flip(options?: {}): any;
    breakdown(field: any, options?: {}): any;
    rollup(groupbyOrOptions?: {}, maybeOptions?: {}): any;
}
import { IdiomState } from "../authoring.js";
