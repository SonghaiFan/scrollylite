import { IdiomState, colorFrom } from '../authoring.js';
export function unit(data) {
    return new UnitState({ data, mark: 'unit', encoding: {}, unit: {} });
}
export class UnitState extends IdiomState {
    value(field, options = {}) {
        return this.with({
            unit: {
                ...(this.state['unit'] || {}),
                value: field,
                ...(options.maxUnits ? { maxUnits: options.maxUnits } : {})
            }
        });
    }
    label(field) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), label: field }
        });
    }
    columns(value) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), columns: value }
        });
    }
    radius(value) {
        return this.with({
            unit: { ...(this.state['unit'] || {}), radius: value }
        });
    }
    group(field, options = {}) {
        const { color, ...layoutOptions } = options;
        return unitGuide(this, {
            layout: 'groupedGrid',
            group: field,
            ...layoutOptions,
            ...(color ? { color: colorFrom(color) } : {})
        });
    }
    timeline(field, options = {}) {
        return unitGuide(this, {
            layout: 'timeline',
            ...unitAxis(this, 'x', field, options)
        });
    }
    dodge(field, options = {}) {
        return unitGuide(this, {
            layout: 'dodge',
            ...unitAxis(this, 'x', field, options)
        });
    }
}
function unitGuide(state, guide) {
    return state.guide(guide);
}
function unitAxis(state, channel, field, options = {}) {
    const { title, type, ...rest } = options;
    const current = state.state['encoding']?.[channel];
    if ((field == null || field === current?.field) && title == null && type == null) {
        return rest;
    }
    return {
        [channel]: {
            field,
            type: type || 'quantitative',
            ...(title ? { title } : {})
        },
        ...rest
    };
}
