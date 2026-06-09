export function unit(data: any): UnitState;
export class UnitState extends IdiomState {
    value(field: any, options?: {}): any;
    label(field: any): any;
    columns(value: any): any;
    radius(value: any): any;
    group(field: any, options?: {}): any;
    timeline(field: any, options?: {}): any;
    dodge(field: any, options?: {}): any;
}
import { IdiomState } from "../authoring.js";
