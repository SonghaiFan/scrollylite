import { ViewState, cloneState } from "../../grammar/view-state.js?v=semantic-key-10";
import { externalizeScrollyViewSpec } from "../../scrolly-meta.js?v=semantic-key-11";
import { compileViewSpec } from "../../transitions/index.js?v=semantic-key-19";
import { labelFromValue, titleize } from "../../labels.js?v=semantic-key-1";

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
    const filters = [
      ...(spec.where || []),
      ...(spec.filter ? [spec.filter] : [])
    ];
    if (filters.length) {
      spec.transform = [
        ...filters.map((filter) => ({ filter })),
        ...(spec.transform || [])
      ];
    }
    if (spec.where?.length) {
      delete spec.where;
    }
    delete spec.filter;
    delete spec.where;
    if (spec.granularity == null) delete spec.granularity;
    if (spec.guide == null) delete spec.guide;
    delete spec.aggregate;
    if (spec.semanticKey == null) delete spec.semanticKey;
    return pruneAuthoringState(
      compileViewSpec(externalizeScrollyViewSpec(spec), { scene: [] })
    );
  }

  x(field, options = {}) {
    const channel = channelFrom(field, { type: "nominal", ...options });
    return this.with({
      key: this.state.key || channel.field,
      encoding: {
        x: channel
      }
    });
  }

  y(field, options = {}) {
    if (typeof options === "string") options = { title: options };
    const { color, tooltip, ...channelOptions } = options;
    const channel = channelFrom(field, { type: "quantitative", ...channelOptions });
    return this.with({
      encoding: {
        y: channel,
        ...(color ? { color: colorFrom(color) } : {}),
        ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
      }
    });
  }

  channel(name, field, options = {}) {
    return this.with({
      encoding: {
        [name]: channelFrom(field, options)
      }
    });
  }

  color(valueOrField, options = {}) {
    return this.with({ encoding: { color: colorFrom(valueOrField, options) } });
  }

  tooltip(items) {
    return this.with({
      encoding: {
        tooltip: cloneState(items.map((item) => (
          typeof item === "string" ? { field: item, title: titleize(item) } : item
        )))
      }
    });
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

  highlight(selector, options = {}) {
    return this.with({
      focus: {
        mode: "highlight",
        filter: normalizeSelector(selector),
        opacity: options.opacity
      }
    }, "focus");
  }

  where(selector) {
    if (selector == null) {
      return this.with({ where: [] }, "focus");
    }

    const selectors = normalizeSelectors(selector);
    const identity = identityFromSelectors(this.state, selectors);
    const measureTitle = measureTitleFromSelectors(this.state, selectors);
    return this.with({
      where: setConstraints(this.state.where || [], selectors),
      ...(identity ? identity : {}),
      ...(measureTitle ? {
        encoding: {
          y: {
            ...this.state.encoding.y,
            title: measureTitle
          }
        }
      } : {}),
      __grammar: {
        lastWhere: {
          selectors: cloneState(selectors),
          fields: selectors.map((item) => item.field)
        },
        ...(measureTitle ? {
          measureSelector: {
            title: measureTitle,
            fields: selectors.map((item) => item.field)
          }
        } : {})
      }
    }, "focus");
  }

  guide(config = {}) {
    return this.with({ guide: cloneState(config) }, "guide");
  }

  flip(options = {}) {
    const domain = options.domain || options.scale?.domain;
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
      flip: true,
      ...(scale ? { scale } : {}),
      ...(staging ? { staging } : {})
    });
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
        __grammar: {
          measureSelector: null
        },
        ...(normalized.tooltip
          ? {
              encoding: {
                tooltip: cloneState(normalized.tooltip)
              }
            }
          : {})
      }, "granularity");
    }

    return this.with({
      key: normalized.key || (groupby.length === 1 ? groupby[0] : groupby),
      granularity: null,
      guide: null,
      semanticKey: normalized.semanticKey || null,
      where: this.state.where,
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
      ],
      __grammar: {
        measureSelector: null
      }
    }, "granularity");
  }

  breakdown(segment = "type", options = {}) {
    const category = options.category || this.state.encoding?.x?.field;
    const value = options.value || this.state.encoding?.y?.field || "count";
    const {
      by,
      category: _category,
      value: _value,
      ...rest
    } = options;

    const next = this.agg({
      ...rest,
      by: by || [category, segment],
      segment,
      value,
      layout: options.layout || "stacked",
      op: options.op || "sum"
    });
    return options.title === false
      ? next
      : next.y(value, { title: options.title || titleize(value) });
  }

  rollup(groupby = null, options = {}) {
    if (groupby && typeof groupby === "object") {
      options = groupby;
      groupby = options.groupby || options.by || null;
    }
    const parent = groupby || options.groupby || options.by || this.state.encoding?.x?.field;
    const fields = asArray(parent).filter(Boolean);
    const value = options.value || this.state.encoding?.y?.field || "count";
    const {
      color,
      title,
      by,
      groupby: _groupby,
      value: _value,
      ...rest
    } = options;
    let next = this.agg({
      ...rest,
      groupby: fields,
      value,
      as: options.as || value,
      op: options.op || "sum"
    });

    if (title) next = next.y(value, { title });
    if (color) next = next.color(color);
    return next;
  }

  split(segment = "type", options = {}) {
    return this.breakdown(segment, options);
  }

  collapse(groupby = null, options = {}) {
    return this.rollup(groupby || options.groupby || options.by || this.state.encoding?.x?.field, options);
  }

  aggregate(groupby = null, options = {}) {
    return this.collapse(groupby, options);
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
      ...(config.tooltip
        ? {
            encoding: {
              tooltip: cloneState(config.tooltip)
            }
          }
        : {})
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

function colorFrom(valueOrField, options = {}) {
  if (typeof valueOrField === "object") return cloneState(valueOrField);
  if (typeof valueOrField === "string" && valueOrField.startsWith("#")) {
    return { value: valueOrField };
  }
  return options.value
    ? { value: options.value }
    : { field: valueOrField, type: "nominal", ...options };
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

function identityFromSelectors(state = {}, selectors = []) {
  const category = state.encoding?.x?.field;
  const measure = selectors.find((selector) => (
    selector.field &&
    Object.prototype.hasOwnProperty.call(selector, "equal") &&
    isMeasureSelectorField(selector.field)
  ));

  if (!category || !measure) return null;

  return {
    key: [category, measure.field],
    semanticKey: {
      entity: { field: category },
      measure: { field: measure.field }
    }
  };
}

function measureTitleFromSelectors(state = {}, selectors = []) {
  const y = state.encoding?.y;
  if (!y?.field) return null;

  const measure = selectors.find((selector) => (
    selector.field &&
    Object.prototype.hasOwnProperty.call(selector, "equal") &&
    isMeasureSelectorField(selector.field)
  ));
  if (!measure) return null;

  const currentTitle = y.title || titleize(y.field);
  const previousMeasureTitle = state.__grammar?.measureSelector?.title;
  const titleCanFollowSelector =
    currentTitle === titleize(y.field) ||
    currentTitle === previousMeasureTitle;

  return titleCanFollowSelector ? labelFromValue(measure.equal) : null;
}

function isMeasureSelectorField(field) {
  return field === "type" || field === "kind" || field.endsWith("_type") || field.endsWith("_kind");
}

function normalizeAggregation(config = {}, state = {}) {
  const aggregate = typeof config === "string" ? { groupby: config } : config;
  const xField = state.encoding?.x?.field;
  const yField = state.encoding?.y?.field;
  const groupby = asArray(
    aggregate.by ||
    aggregate.groupby ||
    xField
  ).filter(Boolean);
  const value = aggregate.value || aggregate.field || yField || "value";
  const as = aggregate.as || value;
  const op = aggregate.op || aggregate.use || "sum";
  const segment =
    aggregate.segment ||
    groupby.find((field) => field !== xField);
  const category = aggregate.category || xField || groupby.find((field) => field !== segment);

  return {
    ...aggregate,
    groupby,
    category,
    categoryTitle: aggregate.categoryTitle || titleize(category),
    segment,
    value,
    as,
    valueTitle: aggregate.valueTitle || (segment ? titleize(value) : state.encoding?.y?.title || titleize(as)),
    op
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function pruneAuthoringState(spec) {
  const next = cloneState(spec);
  delete next.margin;
  const state = next.narrative?.state;
  if (!state) return next;

  const sceneState = state.sceneState || {};
  const preservedSceneState = {};
  const focus = sceneState.focus || state.focus;
  const guide = sceneState.guide || state.guide;

  if (focus?.mode === "highlight") {
    preservedSceneState.focus = focus;
  }
  if (hasCustomGuideStaging(guide)) {
    preservedSceneState.guide = {
      ...(guide.layout ? { layout: guide.layout } : {}),
      ...(guide.orientation ? { orientation: guide.orientation } : {}),
      staging: guide.staging
    };
  }

  delete state.focus;
  delete state.guide;
  delete state.granularity;
  state.sceneState = preservedSceneState;
  if (!Object.keys(state.sceneState).length) delete state.sceneState;

  if (!Object.keys(state).length) delete next.narrative.state;
  if (next.narrative && !Object.keys(next.narrative).length) delete next.narrative;
  return next;
}

function hasCustomGuideStaging(guide = null) {
  if (!guide?.staging) return false;
  const staging = guide.staging;
  if (staging.duration != null || staging.stagger != null) return true;
  if (!Array.isArray(staging.order)) return false;
  return staging.order.join("|") !== defaultGuideOrder(guide).join("|");
}

function defaultGuideOrder(guide = {}) {
  return guide.orientation === "horizontal" ? ["y", "x"] : ["x", "y"];
}
