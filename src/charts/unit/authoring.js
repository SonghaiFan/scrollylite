import { IdiomState, colorFrom } from "../authoring.js?v=semantic-key-1";

export function unit(data) {
  return new UnitState({
    data,
    mark: "unit",
    encoding: {},
    unit: {}
  });
}

export class UnitState extends IdiomState {
  value(field, options = {}) {
    return this.with({
      unit: {
        ...(this.state.unit || {}),
        valueField: field,
        ...(options.labelField ? { labelField: options.labelField } : {}),
        ...(options.maxUnits ? { maxUnits: options.maxUnits } : {})
      }
    });
  }

  label(field) {
    return this.with({
      unit: {
        ...(this.state.unit || {}),
        labelField: field
      }
    });
  }

  columns(value) {
    return this.with({
      unit: {
        ...(this.state.unit || {}),
        columns: value
      }
    });
  }

  radius(value) {
    return this.with({
      unit: {
        ...(this.state.unit || {}),
        radius: value
      }
    });
  }

  layout(layout, options = {}) {
    return this.guide({
      layout,
      ...options
    });
  }

  group(field, options = {}) {
    return this.layout("groupedGrid", {
      groupField: field,
      ...(options.color ? { color: colorFrom(options.color) } : {}),
      ...options
    });
  }

  timeline(field, options = {}) {
    return this.layout("timeline", {
      xField: field,
      xType: options.xType || "quantitative",
      xTitle: options.xTitle || this.state.encoding?.x?.title,
      ...options
    });
  }

  dodge(field, options = {}) {
    return this.layout("dodge", {
      xField: field,
      xType: options.xType || "quantitative",
      xTitle: options.xTitle || this.state.encoding?.x?.title,
      ...options
    });
  }
}
