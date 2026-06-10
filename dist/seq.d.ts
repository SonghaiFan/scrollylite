import type { ViewSpec, StorySpec, ChartRuntime } from './types/index.js';
export interface SeqState {
    /** The view spec for this state */
    spec: ViewSpec;
    /** Narrative text / HTML fragment */
    text: string;
    /** Optional heading */
    title?: string;
    /** Zero-based position in the sequence */
    index: number;
}
type ViewLike = ViewSpec | {
    toSpec(): ViewSpec;
};
export declare class Seq {
    private _entries;
    private _cursor;
    private _builder;
    private _bindings;
    private _onChange?;
    constructor();
    /** Register a named data source, same as story().data() */
    data(name: string, source: unknown): this;
    /** Set view dimensions, same as story().view('main', opts) */
    view(opts: ViewSpec): this;
    /** Add a state: chart grammar object + optional narrative text */
    add(viewSpec: ViewLike, text?: string, opts?: {
        title?: string;
    }): this;
    /** Total number of states */
    get length(): number;
    /** Zero-based cursor position (-1 before first navigation) */
    get index(): number;
    /** Whether the cursor is at the last state */
    get atEnd(): boolean;
    /** Whether the cursor is at the first state */
    get atStart(): boolean;
    /** Current state, or null before the first navigation */
    get current(): SeqState | null;
    /** Read state at position without moving the cursor */
    at(index: number): SeqState;
    /** Jump to position, notify all bindings, return the new state */
    goto(index: number): SeqState;
    /** Advance to the next state */
    next(): SeqState;
    /** Go back to the previous state */
    prev(): SeqState;
    /**
     * Bind a chart and/or text element.
     * After binding, seq.next() / seq.goto() automatically drive both.
     *
     * @example
     * sq.bind({ chart, text: document.querySelector('#caption') });
     * sq.bind({ chart, text: '#caption' });  // CSS selector also accepted
     * btn.onclick = () => sq.next();
     */
    bind(bindings: {
        chart?: ChartRuntime;
        text?: Element | string;
    }): this;
    /** Register a custom onChange handler */
    on(event: 'change', handler: (state: SeqState) => void): this;
    /**
     * Compile to a StorySpec.
     * Called internally by sl.chart(seq, opts) — you rarely need this directly.
     */
    toSpec(): StorySpec;
    /**
     * Sync cursor position without triggering notifications.
     * Called by sl.chart(seq, opts) to align cursor with chart's initialStep
     * so the first sq.next() advances to step 1 rather than step 0.
     */
    syncCursor(index: number): void;
    private _stateAt;
    private _notify;
}
/** Create a new state sequence builder */
export declare function seq(): Seq;
export {};
