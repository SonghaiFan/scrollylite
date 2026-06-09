import { line } from "../../../dist/index.js";
import { story } from "./shared.js";

export function createLineStory({ actionMode = "stepper" } = {}) {
  const base = line("weather")
    .x("decade")
    .y("hot_days")
    .key("decade")
    .sort("year");

  const cold = base
    .y("cold_days");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Focus, Guide, Observation, and Granularity on a trend line. " +
      "Each scene changes one dimension of how the line is read or grouped."
    )
    .step(
      "Baseline: hot-days trend",
      base,
      {
        body: "One line over decades — vertical position encodes hot days.",
        authoring: 'line("weather").x("decade").y("hot_days").key("decade").sort("year")'
      }
    )
    .step(
      "Focus: zoom to recent decades",
      base.where({ period: "recent" }),
      {
        body: "Focus keeps the line objects intact and rescales x to the recent period.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: logarithmic y scale",
      base.guide({ y: { scale: { type: "log" } } }),
      {
        body: "Guide changes the reading frame — same data, different scale for the y axis.",
        authoring: 'base.guide({ y: { scale: { type: "log" } } })'
      }
    )
    .step(
      "Observation: switch to cold days",
      cold,
      {
        body: "Observation swaps the encoded variable — same decade path, y now encodes cold days.",
        authoring: 'base.y("cold_days")'
      }
    )
    .step(
      "Granularity: split line into periods",
      cold.breakdown("period", { color: { field: "period", type: "nominal" } }),
      {
        body: "Granularity splits one continuous line into per-period segments — same points, new grouping.",
        authoring: 'cold.breakdown("period", { color: { field: "period", type: "nominal" } })'
      }
    )
    .step(
      "Granularity: merge back to one line",
      cold.rollup(),
      {
        body: "Granularity merges period segments back into a single continuous trend.",
        authoring: 'cold.rollup()'
      }
    )
    .toSpec();
}
