export class ViewState {
    constructor(state = {}) {
        this.state = Object.freeze(cloneState(state));
    }
    with(patch, operation) {
        const next = mergeState(this.state, patch);
        if (operation) {
            const operationName = typeof operation === 'string'
                ? operation
                : (operation.name ?? operation.operation ?? '');
            let ops = [...(this.state.__grammar?.operations ?? [])];
            if (typeof operation === 'object' && operation.replaceLast) {
                if (ops[ops.length - 1] === operation.replaceLast) {
                    ops = ops.slice(0, -1);
                }
            }
            next.__grammar = {
                ...(next.__grammar ?? {}),
                operations: operationName ? [...ops, operationName] : ops
            };
        }
        const Ctor = this.constructor;
        return new Ctor(next);
    }
    toSpec() {
        const spec = cloneState(this.state);
        delete spec.__grammar;
        return spec;
    }
    operations() {
        return [...(this.state.__grammar?.operations ?? [])];
    }
}
export function cloneState(value) {
    if (Array.isArray(value))
        return value.map(cloneState);
    if (!value || typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneState(v)]));
}
export function mergeState(base, patch) {
    const next = cloneState(base);
    for (const [key, value] of Object.entries(patch)) {
        const existing = next[key];
        if (isPlainObject(value) && isPlainObject(existing)) {
            next[key] = mergeState(existing, value);
        }
        else {
            next[key] = cloneState(value);
        }
    }
    return next;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
