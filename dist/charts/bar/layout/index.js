export function barOrientationFromEncoding(encoding = {}) {
    return isQuantitative(encoding.x) && isDiscrete(encoding.y) ? 'horizontal' : 'vertical';
}
export function barCategoryChannelName(encoding = {}) {
    return barOrientationFromEncoding(encoding) === 'horizontal' ? 'y' : 'x';
}
export function barMeasureChannelName(encoding = {}) {
    return barOrientationFromEncoding(encoding) === 'horizontal' ? 'x' : 'y';
}
export function barCategoryChannel(encoding = {}) {
    return encoding[barCategoryChannelName(encoding)] ?? {};
}
export function barMeasureChannel(encoding = {}) {
    return encoding[barMeasureChannelName(encoding)] ?? {};
}
export function barOffsetChannelName(orientation) {
    return orientation === 'horizontal' ? 'yOffset' : 'xOffset';
}
export function barRendererKey(layout, orientation) {
    if (layout === 'grouped')
        return `grouped-${orientation}`;
    if (layout === 'stacked')
        return `stacked-${orientation}`;
    return orientation;
}
export function barLayoutTransitionRoute({ fromLayout, toLayout, change }) {
    const from = barLayoutDefinition(fromLayout);
    const to = barLayoutDefinition(toLayout);
    const fromVia = from.transition?.[change]?.to?.[to.key]?.via ?? [];
    const toVia = to.transition?.[change]?.from?.[from.key]?.via ?? [];
    return [...fromVia, ...toVia];
}
export function isSegmentLayout(layout) {
    return layout === 'grouped' || layout === 'stacked';
}
function barLayoutDefinition(layout) {
    return BAR_LAYOUTS[layout ?? 'simple'] ?? BAR_LAYOUTS.simple;
}
const BAR_LAYOUTS = {
    simple: { key: 'simple' },
    stacked: { key: 'stacked' },
    grouped: {
        key: 'grouped',
        transition: {
            collapse: { to: { simple: { via: ['stacked'] } } },
            split: { from: { simple: { via: ['stacked'] } } }
        }
    }
};
function isQuantitative(channel) {
    return channel?.type === 'quantitative';
}
function isDiscrete(channel) {
    return channel?.type === 'nominal' || channel?.type === 'ordinal';
}
