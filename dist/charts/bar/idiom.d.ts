import type { ChartDeps, ChartIdiom, ViewSpec } from '../../types/index.js';
export interface BarSpec extends ViewSpec {
    mark: 'bar';
}
export declare function createBarIdiom(deps: ChartDeps): ChartIdiom<BarSpec>;
