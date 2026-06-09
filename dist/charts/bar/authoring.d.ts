export function bar(data: any): BarState;
export class BarState extends IdiomState {
    flip(options?: {}): any;
    breakdown(segment?: string, options?: {}): any;
    rollup(groupby?: any, options?: {}): any;
    segment(fieldOrConfig?: {}, maybeConfig?: {}): any;
    layout(layout: any, options?: {}): any;
    stage(order: any, options?: {}): any;
}
import { IdiomState } from "../authoring.js";
