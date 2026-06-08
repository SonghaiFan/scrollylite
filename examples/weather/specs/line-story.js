import { line } from "../../../src/index.js";
import { COLD_COLOR, COLD_PERIOD_COLOR, HOT_COLOR, story } from "./shared.js";

export function createLineStory() {
  const base = line("weather")
    .x("decade")
    .y("hot_days")
    .color(HOT_COLOR)
    .key("decade")
    .sort("year");

  const cold = base
    .y("cold_days")
    .color(COLD_COLOR);

  return story.demo()
    .layout("floatToText")
    .description(
      "This demo keeps the mark fixed as line and demonstrates Focus, Guide, Observation, and Granularity as changes in scale, encoded measure, and line grouping."
    )
    .step(
      "Baseline: hot-days trend line",
      base,
      {
        body: "Start with one continuous line over decades, using vertical position to encode hot days.",
        authoring: "base"
      }
    )
    .step(
      "Focus: zoom to a subset",
      base.where({ period: "recent" }),
      {
        body: "The focus scene keeps the line objects intact, rescales the x range to the recent period, and crops overflow outside the plot.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: change vertical scale",
      base.guide({
        y: {
          scale: { type: "log" }
        }
      }),
      {
        body: "The guide scene keeps hot days as the observation but changes the reading guide to a logarithmic y scale.",
        authoring: 'base.guide({ y: { scale: { type: "log" } } })'
      }
    )
    .step(
      "Observation: change encoded variable",
      cold,
      {
        body: "The observation scene keeps the same decade path but changes y from hot days to cold days.",
        authoring: 'base.y("cold_days").color("#536a9e")'
      }
    )
    .step(
      "Granularity: split trend into periods",
      cold.breakdown("period", { color: COLD_PERIOD_COLOR }),
      {
        body: "The granularity scene keeps decade points consistent but splits the line into period-level segments.",
        authoring: 'cold.breakdown("period", { color: COLD_PERIOD_COLOR })'
      }
    )
    .step(
      "Granularity: merge periods into one line",
      cold.rollup({ color: COLD_COLOR }),
      {
        body: "The granularity scene merges the period-level line segments back into one continuous trend.",
        authoring: 'cold.rollup({ color: "#536a9e" })'
      }
    )
    .toSpec();
}
