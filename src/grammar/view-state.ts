import type { GrammarMeta } from '../types/index.js';

// Internal representation includes the private grammar metadata
type StateWithMeta<S extends object> = S & { __grammar?: GrammarMeta };

interface OperationConfig {
  name?: string;
  operation?: string;
  replaceLast?: string;
}

export class ViewState<S extends object = Record<string, unknown>> {
  readonly state: Readonly<StateWithMeta<S>>;

  constructor(state: S | StateWithMeta<S> = {} as S) {
    this.state = Object.freeze(cloneState(state)) as Readonly<StateWithMeta<S>>;
  }

  with(patch: Partial<StateWithMeta<S>>, operation?: string | OperationConfig | null): this {
    const next = mergeState(this.state, patch) as StateWithMeta<S>;

    if (operation) {
      const operationName =
        typeof operation === 'string'
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

    const Ctor = this.constructor as new (s: S) => this;
    return new Ctor(next as S);
  }

  toSpec(): Omit<S, '__grammar'> {
    const spec = cloneState(this.state) as Record<string, unknown>;
    delete spec.__grammar;
    return spec as Omit<S, '__grammar'>;
  }

  operations(): string[] {
    return [...(this.state.__grammar?.operations ?? [])];
  }
}

export function cloneState<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneState) as unknown as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, cloneState(v)])
  ) as T;
}

export function mergeState<T extends object>(base: T, patch: Partial<T>): T {
  const next = cloneState(base);
  for (const [key, value] of Object.entries(patch) as Array<[keyof T, unknown]>) {
    const existing = (next as Record<keyof T, unknown>)[key];
    if (isPlainObject(value) && isPlainObject(existing)) {
      (next as Record<keyof T, unknown>)[key] = mergeState(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      (next as Record<keyof T, unknown>)[key] = cloneState(value);
    }
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
