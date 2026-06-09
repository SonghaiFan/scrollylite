export function getNarrative(spec?: {}): any;
export function withNarrative(spec?: {}, extension?: {}): {
    narrative: any;
};
export function externalizeScrollyViewSpec(spec?: {}): any;
export function normalizeScrollyViewSpec(spec?: {}): {
    transform?: any[];
    key: any;
    semanticKey: {
        measure?: any;
        entity?: any;
    };
    transition: any;
    scroll: any;
    unit: any;
    focus: any;
    guide: any;
    granularity: any;
    sceneState: any;
};
export function narrativeObjectKey(spec?: {}): any;
export function narrativeSemanticKey(spec?: {}): {
    measure?: any;
    entity?: any;
};
export function narrativeTransition(spec?: {}): any;
export function narrativeScroll(spec?: {}): any;
export function narrativeUnit(spec?: {}): any;
export function narrativeState(spec?: {}): {
    focus: any;
    guide: any;
    granularity: any;
    sceneState: any;
};
export function dataName(dataSpec: any): any;
export const NARRATIVE_KEY: "narrative";
