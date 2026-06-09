export declare function expandUnits(rows: any, spec: any, d3: any): any[];
export declare function unitLayout(units: any, chart: any, spec: any, deps: any): {
    name: string;
    axes: boolean;
    r: number;
    x: (d: any) => any;
    y: (d: any) => number;
} | {
    name: string;
    axes: boolean;
    r: number;
    x: (_: any, i: any) => number;
    y: (_: any, i: any) => number;
};
