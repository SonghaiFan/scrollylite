import { ViewState, cloneState } from "../view-state.js";

export function bar(data) {
  return new BarState({
    data,
    mark: "bar",
    encoding: {}
  });
}

export class BarState extends ViewState {
  x(field, options = {}) {
    return this.channel("x", field, { type: "nominal", ...options });
  }

  y(field, options = {}) {
    return this.channel("y", field, { type: "quantitative", ...options });
  }

  channel(name, field, options = {}) {
    return this.with({
      encoding: {
        [name]: channelFrom(field, options)
      }
    });
  }

  color(valueOrField, options = {}) {
    const color = typeof valueOrField === "string" && valueOrField.startsWith("#")
      ? { value: valueOrField }
      : options.value
        ? { value: options.value }
        : { field: valueOrField, type: "nominal", ...options };
    return this.with({ encoding: { color } });
  }

  tooltip(items) {
    return this.with({ encoding: { tooltip: cloneState(items) } });
  }

  key(fields) {
    return this.with({ key: Array.isArray(fields) && fields.length === 1 ? fields[0] : fields });
  }

  sort(field, order = "ascending") {
    const transform = [
      ...(this.state.transform || []),
      { sort: { field, order } }
    ];
    return this.with({ transform });
  }

  transition(timing) {
    return this.with({ transition: timing });
  }

  filter(selector) {
    return this.with({ filter: cloneState(selector) }, "focus");
  }

  guide(config = {}) {
    return this.with({ guide: cloneState(config) }, "guide");
  }

  observe(field, options = {}) {
    return this.with({
      observation: {
        measure: field,
        title: options.title,
        domain: options.domain
      },
      encoding: {
        ...(options.color ? { color: cloneState(options.color) } : {}),
        ...(options.tooltip ? { tooltip: cloneState(options.tooltip) } : {})
      }
    }, "observation");
  }

  segment(config = {}) {
    const category = config.category || this.state.encoding?.x?.field;
    const value = config.value || config.as?.[1] || "value";
    const segment = config.segment || config.as?.[0] || "segment";
    const fields = config.fields || [];
    const labels = config.labels || Object.fromEntries(
      fields.map((field) => [field, titleize(field)])
    );

    return this.with({
      key: config.key || [category, segment],
      granularity: {
        category,
        categoryTitle: config.categoryTitle || this.state.encoding?.x?.title,
        fields,
        labels,
        segment,
        value,
        valueTitle: config.valueTitle || titleize(value),
        layout: config.layout || "stacked",
        color: cloneState(config.color),
        domain: config.domain,
        range: config.range
      },
      encoding: {
        tooltip: cloneState(config.tooltip || [
          { field: category, title: titleize(category) },
          { field: segment, title: "Segment" },
          { field: value, title: titleize(value) }
        ])
      }
    }, "granularity");
  }

  layout(layout, options = {}) {
    const next = this.with({
      granularity: this.state.granularity
        ? {
          ...this.state.granularity,
          layout
        }
        : undefined,
      guide: {
        ...(this.state.guide || {}),
        layout,
        staging: options.staging || this.state.guide?.staging
      }
    });
    return options.stage ? next.stage(options.stage) : next.with({}, "guide");
  }

  stage(order, options = {}) {
    return this.with({
      guide: {
        ...(this.state.guide || {}),
        staging: {
          ...(this.state.guide?.staging || {}),
          ...options,
          order
        }
      }
    }, "guide");
  }
}

function channelFrom(field, options = {}) {
  if (typeof field === "object") return { ...field, ...options };
  return {
    field,
    ...options
  };
}

function titleize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
