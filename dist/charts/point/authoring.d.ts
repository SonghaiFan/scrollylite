export function point(data: any): PointState;
export class PointState extends IdiomState {
    pointSize(value: any): any;
    radius(value: any): any;
    flip(options?: {}): any;
    rollup(groupby: any, options?: {}): any;
    breakdown(detail?: any, options?: {}): any;
}
import { IdiomState } from "../authoring.js";
