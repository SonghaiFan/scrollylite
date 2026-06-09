export function compileFilter(spec: any, operationSpec?: {}, context?: {}): any;
export function compileHighlight(spec: any, operationSpec?: {}, context?: {}): any;
export function compileCartesianCoordinate(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
export function compileCartesianScale(spec: any, operationSpec?: {}, context?: {}): {
    narrative: any;
};
export function identitySpec(spec: any): any;
export function withObject(spec: any, objectSpec?: {}): any;
export function withSceneState(spec: any, sceneStatePatch?: {}): {
    narrative: any;
};
export function semanticToNarrative(semanticKey?: {}): {
    measure?: any;
    entity?: any;
};
export function semanticPartToNarrative(part: any): any;
export function selectorToFilter(selector?: {}): {
    field: any;
};
export function resolveGuideStaging(guideSpec: {}, orientation: any): {
    order: any;
    duration: any;
    stagger: any;
};
export function channelFromField(fieldOrChannel: any, title: any, fallbackType: any): any;
export function mergeXYChannel(base: {}, override: {}, fallbackType: any): any;
export function channelScaleType(channel?: {}): any;
export function aggregateFieldSpec(channelSpec: {}, fallbackField: any, fallbackAs: any, fallbackOp: any): {
    op: any;
    field: any;
    as: any;
};
export function cloneViewSpec(viewSpec: any): any;
export function cloneEncoding(encoding?: {}): {
    [k: string]: any;
};
export function copyDefined(source: any, keys: any): {
    [k: string]: any;
};
