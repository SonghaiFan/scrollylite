import { bar } from "../../../src/index.js";
import { story } from "./shared.js";

export function createBarStory() {
  const base = bar("weatherDays")
    .x("decade")
    .y("count")
    .sort("year");


  return story.demo()
    .layout("floatToText")
    .description(
      "This demo keeps the mark fixed as bar and demonstrates Focus, Guide, and Granularity as scene-state changes over tidy data."
    )
    .step(
      "Baseline: vertical bar chart",
      base.where({ type: "Hot days" }),
      {
        body: "Start with one vertical bar per decade, using bar height to encode hot days.",
        authoring: 'base.where({ type: "Hot days" })'
      }
    )
    .step(
      "Focus: filter to a subset",
      base.where({ type: "Hot days", period: "recent"}),
      {
        body: "The focus scene keeps the bar chart form but filters the data to the recent period.",
        authoring: 'base.where({ type: "Hot days", period: "recent" })'
      }
    )
    .step(
      "Guide: re-orient and rescale",
      base.where({ type: "Hot days", period: "recent"}).flip(),
      {
        body: "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition.",
        authoring: 'base.where({ type: "Hot days", period: "recent" }).flip()'
      }
    )
    .step(
      "Focus: switch selected type",
      base.where({ type: "Cold days" }).flip(),
      {
        body: "In tidy data, changing from hot days to cold days is a keyed filter change over the same count channel.",
        authoring: 'base.where({ type: "Cold days" }).flip()'
      }
    )
    .step(
      "Baseline: return to hot days",
      base.where({ type: "Hot days" }),
      {
        body: "Start with one vertical bar per decade, using bar height to encode hot days.",
        authoring: 'base.where({ type: "Hot days" })'
      }
    )
    .step(
      "Granularity: break down into hot/cold segments",
      base.breakdown("type"),
      {
        body: "The granularity scene changes one aggregate bar into hot/cold segments for each decade.",
        authoring: 'base.breakdown("type")'
      }
    )
    .step(
      "Focus: highlight cold days",
      base.breakdown("type").highlight({ type: "Cold days" }),
      {
        body: "The focus scene keeps both hot and cold segments visible while fading the non-selected type.",
        authoring: 'base.breakdown("type").highlight({ type: "Cold days" })'
      }
    )
    .step(
      "Guide: stacked to grouped segments",
      base.breakdown("type").layout("grouped").flip(),
      {
        body: "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped.",
        authoring: 'base.breakdown("type").layout("grouped").flip()'
      }
    )
    .step(
      "Granularity: roll up to average days",
      base.rollup("decade", { title: "Average days", op: "mean" }),
      {
        body: "The granularity scene rolls child segment keys up into one parent average-days bar per decade.",
        authoring: 'base.rollup("decade", { title: "Average days", op: "mean" })'
      }
    )
    .toSpec();
}
