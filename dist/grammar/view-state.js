export class ViewState {
  constructor(state = {}) {
    this.state = cloneState(state);
    Object.freeze(this.state);
  }

  with(patch = {}, operation = null) {
    const next = mergeState(this.state, patch);
    if (operation) {
      const operationName = typeof operation === "string"
        ? operation
        : operation.name || operation.operation;
      let operations = [
        ...(this.state.__grammar?.operations || [])
      ];
      if (typeof operation === "object" && operation.replaceLast) {
        const last = operations[operations.length - 1];
        if (last === operation.replaceLast) operations = operations.slice(0, -1);
      }
      next.__grammar = {
        ...(next.__grammar || {}),
        operations: operationName ? [...operations, operationName] : operations
      };
    }
    return new this.constructor(next);
  }

  toSpec() {
    const spec = cloneState(this.state);
    delete spec.__grammar;
    return spec;
  }

  operations() {
    return [...(this.state.__grammar?.operations || [])];
  }
}

export function cloneState(value) {
  if (Array.isArray(value)) return value.map(cloneState);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneState(child)])
  );
}

export function mergeState(base = {}, patch = {}) {
  const next = cloneState(base);
  Object.entries(patch).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeState(next[key], value);
    } else {
      next[key] = cloneState(value);
    }
  });
  return next;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
