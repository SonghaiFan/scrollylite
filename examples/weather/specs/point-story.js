import { point } from "../../../dist/index.js";
import { story } from "./shared.js";

export function createPointStory({ actionMode = "stepper" } = {}) {
  const base = point("weather")
    .x("tmin")
    .y("tmax")
    .color({ field: "period", type: "nominal" })
    .key("decade")
    .sort("year");

  const hotCold = base
    .x("hot_days")
    .y("cold_days");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Focus, Guide, Observation, and Granularity on scatter points. " +
      "Circles carry semantic identity across axis and variable changes."
    )
    .step(
      "Baseline: temperature scatter",
      base,
      {
        body: "One circle per decade — x encodes min temperature, y encodes max temperature. Color encodes period.",
        authoring: 'point("weather").x("tmin").y("tmax")\n  .color({ field: "period", type: "nominal" })\n  .key("decade").sort("year")'
      }
    )
    .step(
      "Focus: filter to recent decades",
      base.where({ period: "recent" }),
      {
        body: "Focus removes older decades. The same circles shrink to the recent subset.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: flip axes, log scale",
      base.flip({ x: { scale: { type: "log" } } }),
      {
        body: "Guide flips x and y and applies a log scale — the same circles, read differently.",
        authoring: 'base.flip({ x: { scale: { type: "log" } } })'
      }
    )
    .step(
      "Observation: hot/cold axes",
      hotCold,
      {
        body: "Observation remaps both axes — x becomes hot days, y becomes cold days. Circles keep their decade identity.",
        authoring: 'base.x("hot_days").y("cold_days")'
      }
    )
    .step(
      "Granularity: merge to periods",
      hotCold.rollup("period"),
      {
        body: "Granularity merges decade circles into three aggregate period circles.",
        authoring: 'hotCold.rollup("period")'
      }
    )
    .step(
      "Granularity: split back to decades",
      hotCold.breakdown("decade"),
      {
        body: "Granularity splits each period circle back into its constituent decades.",
        authoring: 'hotCold.breakdown("decade")'
      }
    )
    .toSpec();
}
