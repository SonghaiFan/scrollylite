export function pointState(spec?: {}, enc?: {}): {
    parentField: any;
    granularityMode: any;
};
export function parentAnchors(rows: any, parentField: any, positionForRow: any): Map<any, {
    x: number;
    y: number;
}>;
export function parentKey(row: any, parentField: any): string;
export function radiusScale(rows: any, channel: any, fallback: any, d3: any, quantitativeDomain: any): (row: any) => any;
export function defaultPointRadius(count: any): 7 | 4.5 | 9 | 5.5;
