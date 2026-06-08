import { IdiomState } from "../authoring.js?v=semantic-key-1";

export function point(data) {
  return new PointState({
    data,
    mark: "point",
    encoding: {}
  });
}

export function scatter(data) {
  return point(data);
}

export class PointState extends IdiomState {
  x(field, options = {}) {
    return super.x(field, { type: "quantitative", ...options });
  }

  y(field, options = {}) {
    return super.y(field, { type: "quantitative", ...options });
  }

  pointSize(value) {
    return this.with({ size: value });
  }

  radius(value) {
    return this.pointSize(value);
  }

  flip(options = {}) {
    return this.guide({
      flip: true,
      ...(options.x ? { x: options.x } : {}),
      ...(options.y ? { y: options.y } : {}),
      ...(options.staging || options.stage || options.order
        ? {
            staging: {
              ...(typeof options.staging === "object" ? options.staging : {}),
              order: options.order || options.stage || options.staging?.order || ["x", "y"]
            }
          }
        : {})
    });
  }

  rollup(groupby, options = {}) {
    const fields = Array.isArray(groupby) ? groupby : [groupby].filter(Boolean);
    return this.with({
      granularity: {
        mode: "aggregate",
        groupby: fields,
        key: options.key || (fields.length === 1 ? fields[0] : fields),
        parentField: options.parentField || fields[0],
        x: options.x,
        y: options.y,
        countAs: options.countAs,
        sizeRange: options.sizeRange
      }
    }, "granularity");
  }

  breakdown(detail = null, options = {}) {
    const config = detail && typeof detail === "object"
      ? detail
      : { detail, ...options };
    return this.with({
      granularity: {
        mode: "detail",
        key: config.key || this.state.key,
        parentField: config.parentField,
        detail: config.detail || this.state.key
      }
    }, "granularity");
  }
}
