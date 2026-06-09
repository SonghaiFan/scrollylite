export function cloneState(value: any): any;
export function mergeState(base?: {}, patch?: {}): any;
export class ViewState {
    constructor(state?: {});
    state: any;
    with(patch?: {}, operation?: any): any;
    toSpec(): any;
    operations(): any[];
}
