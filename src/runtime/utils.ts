import { titleize as sharedTitleize } from '../labels.js';

export function uniqueTokens(values: unknown[]): string[] {
  return [...new Set(asArray(values).filter(Boolean).map(String))];
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function cloneSpec<T>(spec: T): T {
  if (spec == null) return spec;
  return JSON.parse(JSON.stringify(spec)) as T;
}

export function dash(value: unknown): string {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function titleize(value: unknown): string {
  return sharedTitleize(value);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
