export function unitKey(datum: Record<string, unknown>): unknown {
  return datum['__unitKey'];
}
