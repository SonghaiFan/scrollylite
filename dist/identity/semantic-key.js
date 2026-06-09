import { narrativeObjectKey, narrativeSemanticKey } from "../scrolly-meta.js";
export function keyAccessor(spec, fallbackField = "id") {
    const key = narrativeObjectKey(spec) || fallbackField;
    if (Array.isArray(key))
        return (d, i) => key.map((field) => d[field]).join("|") || i;
    if (typeof key === "function")
        return key;
    return (d, i) => d[key] ?? d.__unitKey ?? i;
}
export function semanticKeyForDatum(datum, spec = {}) {
    const semanticKey = narrativeSemanticKey(spec);
    if (!semanticKey || !datum)
        return null;
    const parts = [
        ...semanticKeyParts(semanticKey.entity ?? semanticKey.entities, datum, "field"),
        ...semanticKeyParts(semanticKey.measure ?? semanticKey.measures, datum, "value")
    ];
    if (!parts.length || parts.some((part) => part == null || part === ""))
        return null;
    return parts.map((part) => String(part)).join("|");
}
export function semanticMeasureForDatum(datum, spec = {}) {
    const semanticKey = narrativeSemanticKey(spec);
    if (!semanticKey || !datum)
        return null;
    return semanticKeyParts(semanticKey.measure ?? semanticKey.measures, datum, "value")[0] ?? null;
}
function semanticKeyParts(parts, datum, stringRole) {
    return arrayOf(parts)
        .map((part) => semanticPartValue(part, datum, stringRole))
        .filter((value) => value != null && value !== "");
}
function semanticPartValue(part, datum, stringRole) {
    if (part == null)
        return null;
    if (typeof part === "function")
        return part(datum);
    if (typeof part === "string") {
        return stringRole === "value" ? datum[part] ?? part : datum[part];
    }
    if (Object.prototype.hasOwnProperty.call(part, "value"))
        return part.value;
    if (part.field)
        return datum[part.field];
    return null;
}
function arrayOf(value) {
    if (value == null)
        return [];
    return Array.isArray(value) ? value : [value];
}
