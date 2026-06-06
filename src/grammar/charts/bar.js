import { ViewState, cloneState } from "../view-state.js";

export function bar(data) {
  return new BarState({
    data,
    mark: "bar",
    encoding: {}
  });
}

export class BarState extends ViewState {
  toSpec() {
    const spec = super.toSpec();
    if (spec.where?.length) {
      spec.transform = [
        ...spec.where.map((filter) => ({ filter })),
        ...(spec.transform || [])
      ];
    }
    delete spec.where;
    if (spec.granularity == null) delete spec.granularity;
    if (spec.guide == null) delete spec.guide;
    if (spec.aggregate == null) delete spec.aggregate;
    return spec;
  }

  x(field, options = {}) {
    return this.channel("x", field, { type: "nominal", ...options });
  }

  y(field, options = {}) {
    const { color, tooltip, ...channelOptions } = options;
    const channel = channelFrom(field, { type: "quantitative", ...channelOptions });
    const previous = this.state.encoding?.y;
    const patch = {
      encoding: {
        y: channel,
        ...(color ? { color: cloneState(color) } : {}),
        ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
      }
    };

    if (!previous || previous.field === channel.field) return this.with(patch);

    return this.with({
      ...patch,
      observation: {
        measure: channel.field,
        title: channel.title,
        domain: channel.domain
      }
    }, "observation");
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
    return this.with({ filter: normalizeSelector(selector) }, "focus");
  }

  where(selector) {
    if (selector == null) {
      return this.with({ where: [] }, "focus");
    }

    return this.with({
      where: setConstraints(this.state.where || [], normalizeSelectors(selector))
    }, "focus");
  }

  guide(config = {}) {
    return this.with({ guide: cloneState(config) }, "guide");
  }

  flip(options = {}) {
    const encoding = this.state.encoding || {};
    const category = cloneState(options.category || encoding.x || {});
    const measure = cloneState(options.measure || encoding.y || {});
    const domain = options.domain || options.scale?.domain || measure.domain;
    const scale = domain || options.scale
      ? {
          ...(options.scale || {}),
          ...(domain ? { domain } : {})
        }
      : undefined;
    const staging = options.staging || options.stage || options.order
      ? {
          ...(typeof options.staging === "object" ? options.staging : {}),
          order: options.order || options.stage || options.staging?.order || ["y", "x"]
        }
      : undefined;

    return this.guide({
      orientation: options.orientation || "horizontal",
      category,
      measure,
      ...(scale ? { scale } : {}),
      ...(staging ? { staging } : {})
    });
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

  agg(config = {}) {
    const normalized = normalizeAggregation(config, this.state);
    const groupby = normalized.groupby;
    const segment = normalized.segment;

    if (segment) {
      return this.with({
        key: normalized.key || [normalized.category, segment],
        where: clearConstraint(this.state.where || [], segment),
        granularity: {
          category: normalized.category,
          categoryTitle: normalized.categoryTitle,
          fields: [],
          labels: {},
          segment,
          value: normalized.value,
          valueTitle: normalized.valueTitle,
          layout: normalized.layout || "stacked",
          color: cloneState(normalized.color),
          domain: normalized.domain,
          range: normalized.range,
          source: segment,
          groupby,
          op: normalized.op
        },
        encoding: {
          tooltip: cloneState(normalized.tooltip || [
            { field: normalized.category, title: titleize(normalized.category) },
            { field: segment, title: titleize(segment) },
            { field: normalized.value, title: normalized.valueTitle }
          ])
        }
      }, "granularity");
    }

    return this.with({
      key: normalized.key || (groupby.length === 1 ? groupby[0] : groupby),
      granularity: null,
      guide: null,
      aggregate: {
        groupby,
        value: normalized.value,
        as: normalized.as,
        op: normalized.op
      },
      transform: [
        ...(this.state.transform || []),
        {
          aggregate: {
            groupby,
            fields: [{
              op: normalized.op,
              field: normalized.value,
              as: normalized.as
            }]
          }
        }
      ]
    }, "granularity");
  }

  segment(fieldOrConfig = {}, maybeConfig = {}) {
    const config = typeof fieldOrConfig === "string"
      ? { ...maybeConfig, segment: fieldOrConfig }
      : fieldOrConfig;
    const category = config.category || this.state.encoding?.x?.field;
    const value = config.value || config.as?.[1] || "value";
    const segment = config.segment || config.as?.[0] || "segment";
    const fields = config.fields || [];
    const tidy = !fields.length && Boolean(config.segment);
    const labels = config.labels || Object.fromEntries(
      fields.map((field) => [field, titleize(field)])
    );

    return this.with({
      key: config.key || [category, segment],
      where: tidy ? clearConstraint(this.state.where || [], segment) : this.state.where,
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
        range: config.range,
        source: tidy ? segment : config.source,
        groupby: tidy ? [category, segment] : config.groupby
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
  if (typeof field === "object") {
    const channel = { ...field, ...options };
    return {
      ...channel,
      title: channel.title || titleize(channel.field)
    };
  }
  return {
    field,
    title: titleize(field),
    ...options
  };
}

function normalizeSelector(selector = {}) {
  if (selector.field) return cloneState(selector);
  const entries = Object.entries(selector);
  if (entries.length === 1) {
    const [field, equal] = entries[0];
    return { field, equal };
  }
  return cloneState(selector);
}

function normalizeSelectors(selector = {}) {
  if (selector.field) return [cloneState(selector)];
  return Object.entries(selector).map(([field, equal]) => ({ field, equal }));
}

function setConstraints(constraints, selectors) {
  const fields = new Set(selectors.map((selector) => selector.field));
  const next = constraints.filter((constraint) => !fields.has(constraint.field));
  return [...next, ...selectors.map(cloneState)];
}

function clearConstraint(constraints, field) {
  return constraints.filter((constraint) => constraint.field !== field);
}

function titleize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeAggregation(config = {}, state = {}) {
  const aggregate = typeof config === "string" ? { drop: config } : config;
  const xField = state.encoding?.x?.field;
  const yField = state.encoding?.y?.field;
  const groupby = asArray(
    aggregate.by ||
    aggregate.groupby ||
    (aggregate.drop ? xField : null) ||
    xField
  ).filter(Boolean);
  const value = aggregate.value || aggregate.field || yField || "value";
  const as = aggregate.as || value;
  const op = aggregate.op || aggregate.use || "sum";
  const segment =
    aggregate.segment ||
    (!aggregate.drop ? groupby.find((field) => field !== xField) : null);
  const category = aggregate.category || xField || groupby.find((field) => field !== segment);

  return {
    ...aggregate,
    groupby,
    category,
    categoryTitle: aggregate.categoryTitle || titleize(category),
    segment,
    value,
    as,
    valueTitle: aggregate.valueTitle || state.encoding?.y?.title || titleize(as),
    op
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}
