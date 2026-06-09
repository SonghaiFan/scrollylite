import { titleize as sharedTitleize } from "../labels.js";
export function uniqueTokens(values = []) {
    return Array.from(new Set(asArray(values).filter(Boolean)));
}
export function asArray(value) {
    if (value == null)
        return [];
    return Array.isArray(value) ? value : [value];
}
export function cloneSpec(spec) {
    return spec == null ? spec : JSON.parse(JSON.stringify(spec));
}
export function dash(value) {
    return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
export function titleize(value) {
    return sharedTitleize(value);
}
export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
