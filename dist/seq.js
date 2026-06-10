// @ts-nocheck
// ─── Seq — ordered state sequence with navigation ────────────────────────────
//
// The core primitive: a list of (spec, text) pairs with a navigation cursor.
// Completely decoupled from the DOM — no rendering happens here.
//
// Usage:
//   const sq = seq()
//     .data('weather', { url: '...' })
//     .view({ height: 400 })
//     .add(bar('weather').x('decade').y('count'), 'Hot days per decade')
//     .add(base.flip(), 'Flipped to horizontal');
//
//   const chart = await sl.chart(sq, { target: '#vis', d3, aq });
//   sq.bind({ chart, text: '#caption' });
//   btn.onclick = () => sq.next();
import { story } from './grammar/story.js';
export class Seq {
    constructor() {
        this._entries = [];
        this._cursor = -1;
        this._bindings = [];
        this._builder = story();
    }
    // ── Spec building ──────────────────────────────────────────────────────────
    /** Register a named data source, same as story().data() */
    data(name, source) {
        this._builder.data(name, source);
        return this;
    }
    /** Set view dimensions, same as story().view('main', opts) */
    view(opts) {
        this._builder.view('main', opts);
        return this;
    }
    /** Add a state: chart grammar object + optional narrative text */
    add(viewSpec, text = '', opts = {}) {
        const index = this._entries.length;
        this._entries.push({ viewSpec, text, title: opts.title });
        this._builder.step(opts.title ?? `Step ${index + 1}`, viewSpec, { body: text });
        return this;
    }
    // ── Navigation ─────────────────────────────────────────────────────────────
    /** Total number of states */
    get length() {
        return this._entries.length;
    }
    /** Zero-based cursor position (-1 before first navigation) */
    get index() {
        return this._cursor;
    }
    /** Whether the cursor is at the last state */
    get atEnd() {
        return this._cursor >= this._entries.length - 1;
    }
    /** Whether the cursor is at the first state */
    get atStart() {
        return this._cursor <= 0;
    }
    /** Current state, or null before the first navigation */
    get current() {
        return this._cursor >= 0 ? this._stateAt(this._cursor) : null;
    }
    /** Read state at position without moving the cursor */
    at(index) {
        return this._stateAt(Math.max(0, Math.min(index, this._entries.length - 1)));
    }
    /** Jump to position, notify all bindings, return the new state */
    goto(index) {
        this._cursor = Math.max(0, Math.min(index, this._entries.length - 1));
        const state = this._stateAt(this._cursor);
        this._notify(state);
        return state;
    }
    /** Advance to the next state */
    next() {
        return this.goto(this._cursor + 1);
    }
    /** Go back to the previous state */
    prev() {
        return this.goto(this._cursor - 1);
    }
    // ── Binding ────────────────────────────────────────────────────────────────
    /**
     * Bind a chart and/or text element.
     * After binding, seq.next() / seq.goto() automatically drive both.
     *
     * @example
     * sq.bind({ chart, text: document.querySelector('#caption') });
     * sq.bind({ chart, text: '#caption' });  // CSS selector also accepted
     * btn.onclick = () => sq.next();
     */
    bind(bindings) {
        const textEl = typeof bindings.text === 'string'
            ? document.querySelector(bindings.text)
            : (bindings.text ?? null);
        this._bindings.push({ chart: bindings.chart, text: textEl ?? undefined });
        return this;
    }
    /** Register a custom onChange handler */
    on(event, handler) {
        if (event === 'change')
            this._onChange = handler;
        return this;
    }
    // ── Compilation ────────────────────────────────────────────────────────────
    /**
     * Compile to a StorySpec.
     * Called internally by sl.chart(seq, opts) — you rarely need this directly.
     */
    toSpec() {
        return this._builder.toSpec();
    }
    // ── Internal ───────────────────────────────────────────────────────────────
    /**
     * Sync cursor position without triggering notifications.
     * Called by sl.chart(seq, opts) to align cursor with chart's initialStep
     * so the first sq.next() advances to step 1 rather than step 0.
     */
    syncCursor(index) {
        this._cursor = Math.max(0, Math.min(index, this._entries.length - 1));
    }
    _stateAt(index) {
        const entry = this._entries[index];
        const spec = entry.viewSpec && typeof entry.viewSpec.toSpec === 'function'
            ? entry.viewSpec.toSpec()
            : entry.viewSpec;
        return { spec, text: entry.text, title: entry.title, index };
    }
    _notify(state) {
        for (const b of this._bindings) {
            if (b.chart)
                b.chart.to(state); // polymorphic — accepts SeqState
            if (b.text)
                b.text.innerHTML = state.text ?? '';
        }
        this._onChange?.(state);
    }
}
/** Create a new state sequence builder */
export function seq() {
    return new Seq();
}
