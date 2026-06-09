export function channelFrom(field: any, options?: {}): any;
export function colorFrom(valueOrField: any, options?: {}): any;
export function selectorFrom(selector?: {}): any;
export { titleize };
export class IdiomState extends ViewState {
    data(data: any): any;
    x(field: any, options?: {}): any;
    y(field: any, options?: {}): any;
    channel(name: any, field: any, options?: {}): any;
    color(valueOrField: any, options?: {}): any;
    size(field: any, options?: {}): any;
    key(fields: any): any;
    tooltip(items: any): any;
    sort(field: any, order?: string): any;
    transition(timing: any): any;
    filter(selector: any): any;
    where(selector: any): any;
    highlight(selector: any, options?: {}): any;
    guide(config?: {}): any;
}
import { titleize } from "../labels.js";
import { ViewState } from "../grammar/view-state.js";
