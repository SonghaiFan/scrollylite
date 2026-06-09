import { titleize as sharedTitleize } from '../labels.js';
export function uniqueTokens(values) {
    return [...new Set(asArray(values).filter(Boolean).map(String))];
}
export function asArray(value) {
    if (value == null)
        return [];
    return Array.isArray(value) ? value : [value];
}
export function cloneSpec(spec) {
    if (spec == null)
        return spec;
    return JSON.parse(JSON.stringify(spec));
}
export function dash(value) {
    return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
export function titleize(value) {
    return sharedTitleize(value);
}
export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
