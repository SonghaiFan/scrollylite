import { bar } from "../../../dist/index.js";
import { story } from "./shared.js";

export function createBarStory({ actionMode = "stepper" } = {}) {
  const base = bar("weatherDays")
    .x("decade")
    .y("count")
    .sort("year");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Focus, Guide, and Granularity scene transitions on tidy data. " +
      "Each step changes one semantic dimension of the bar chart."
    )
    .step(
      "Baseline: vertical bar chart",
      base.where({ type: "Hot days" }),
      {
        body: "One vertical bar per decade — bar height encodes hot days count.",
        authoring: 'bar("weatherDays").x("decade").y("count").sort("year")\n  .where({ type: "Hot days" })'
      }
    )
    .step(
      "Focus: filter to recent decades",
      base.where({ type: "Hot days", period: "recent" }),
      {
        body: "Focus narrows the data to recent decades only. The bar layout is preserved; only the domain changes.",
        authoring: 'base.where({ type: "Hot days", period: "recent" })'
      }
    )
    .step(
      "Guide: flip to horizontal bars",
      base.where({ type: "Hot days", period: "recent" }).flip(),
      {
        body: "Guide changes the reading frame — vertical becomes horizontal with a two-stage axis transition.",
        authoring: 'base.where({ type: "Hot days", period: "recent" }).flip()'
      }
    )
    .step(
      "Focus: switch to cold days",
      base.where({ type: "Cold days" }).flip(),
      {
        body: "A keyed focus update swaps the hot/cold filter while keeping the flipped orientation.",
        authoring: 'base.where({ type: "Cold days" }).flip()'
      }
    )
    .step(
      "Baseline: return to hot days",
      base.where({ type: "Hot days" }),
      {
        body: "Back to the original baseline — no filter, vertical orientation.",
        authoring: 'base.where({ type: "Hot days" })'
      }
    )
    .step(
      "Granularity: hot/cold stacked segments",
      base.breakdown("type"),
      {
        body: "Granularity splits each decade bar into hot and cold segments — one aggregate becomes two.",
        authoring: 'base.breakdown("type")'
      }
    )
    .step(
      "Focus: highlight cold days",
      base.breakdown("type").highlight({ type: "Cold days" }),
      {
        body: "Focus highlights cold segments by fading the hot ones — shape is preserved, emphasis changes.",
        authoring: 'base.breakdown("type").highlight({ type: "Cold days" })'
      }
    )
    .step(
      "Guide: stacked → grouped layout",
      base.breakdown("type").layout("grouped").flip(),
      {
        body: "Guide changes the segment layout from stacked to side-by-side, then flips orientation.",
        authoring: 'base.breakdown("type").layout("grouped").flip()'
      }
    )
    .step(
      "Granularity: roll up to mean",
      base.rollup("decade", { title: "Average days", op: "mean" }),
      {
        body: "Granularity merges segments back into one average-days bar per decade.",
        authoring: 'base.rollup("decade", { title: "Average days", op: "mean" })'
      }
    )
    .toSpec();
}
