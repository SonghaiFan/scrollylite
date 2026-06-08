import { IdiomState, colorFrom } from "../authoring.js?v=semantic-key-3";

export function line(data) {
  return new LineState({
    data,
    mark: "line",
    encoding: {}
  });
}

export class LineState extends IdiomState {
  x(field, options = {}) {
    return super.x(field, { type: "nominal", ...options });
  }

  y(field, options = {}) {
    return super.y(field, { type: "quantitative", ...options });
  }

  curve(value) {
    return this.with({ curve: value });
  }

  strokeWidth(value) {
    return this.with({ strokeWidth: value });
  }

  pointSize(value) {
    return this.with({ pointSize: value });
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

  breakdown(field, options = {}) {
    return this.with({
      granularity: {
        mode: "series",
        series: field,
        ...(options.color
          ? Array.isArray(options.color)
            ? { range: options.color }
            : { color: colorFrom(options.color) }
          : {}),
        ...(options.range ? { range: options.range } : {})
      }
    }, "granularity");
  }

  rollup(groupbyOrOptions = {}, maybeOptions = {}) {
    const options = groupbyOrOptions && typeof groupbyOrOptions === "object"
      ? groupbyOrOptions
      : maybeOptions;
    return this.with({
      granularity: {
        mode: "single",
        ...(options.color ? { color: colorFrom(options.color) } : {})
      }
    }, "granularity");
  }
}
