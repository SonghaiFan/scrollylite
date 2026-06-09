export { semanticBarState } from "./semantic.js";
export function appendBarSemanticDeltas(deltas, previous, next, helpers) {
    const { pushDelta, pushStateDelta } = helpers;
    pushDelta(deltas, "bar.orientation", previous.bar?.orientation, next.bar?.orientation);
    pushDelta(deltas, "bar.layout", previous.bar?.layout, next.bar?.layout);
    pushDelta(deltas, "bar.category-field", previous.bar?.categoryField, next.bar?.categoryField);
    pushDelta(deltas, "bar.measure-field", previous.bar?.measureField, next.bar?.measureField);
    pushStateDelta(deltas, "bar.guide", previous.bar?.guide, next.bar?.guide);
    pushStateDelta(deltas, "bar.granularity", previous.bar?.granularity, next.bar?.granularity);
    pushStateDelta(deltas, "bar.aggregate", previous.bar?.aggregate, next.bar?.aggregate);
    pushDelta(deltas, "bar.segment-field", previous.bar?.segmentField, next.bar?.segmentField);
    pushDelta(deltas, "bar.x-geometry", previous.bar?.xGeometry, next.bar?.xGeometry);
    pushDelta(deltas, "bar.y-geometry", previous.bar?.yGeometry, next.bar?.yGeometry);
}
