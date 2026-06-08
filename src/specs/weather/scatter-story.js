import { point } from "../../charts/point/grammar.js?v=semantic-key-3";
import { PERIOD_LUMINANCE_COLOR, story } from "./shared.js?v=semantic-key-20";

export function createPointStory() {
  const base = point("weather")
    .x("tmin")
    .y("tmax")
    .color(PERIOD_LUMINANCE_COLOR)
    .key("decade")
    .sort("year");

  const hotCold = base
    .x("hot_days")
    .y("cold_days");

  return story.demo()
    .layout("floatToText")
    .description(
      "This demo keeps the mark fixed as point and demonstrates Focus, Guide, Observation, and Granularity with semantic split/merge anchors."
    )
    .step(
      "Baseline: temperature scatter plot",
      base,
      {
        body: "Start with one circle per decade, encoding minimum temperature on x and maximum temperature on y.",
        authoring: "base"
      }
    )
    .step(
      "Focus: filter to a subset",
      base.where({ period: "recent" }),
      {
        body: "The focus scene keeps the scatter plot form but filters to the recent decades.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: flip axes and use log scale",
      base.flip({
        x: { scale: { type: "log" } }
      }),
      {
        body: "The guide scene changes how the same variables are read: axes flip and the horizontal scale becomes logarithmic.",
        authoring: 'base.flip({ x: { scale: { type: "log" } } })'
      }
    )
    .step(
      "Observation: change encoded variables",
      hotCold,
      {
        body: "The observation scene keeps the decade circles but changes both axes to encode hot and cold days.",
        authoring: 'base.x("hot_days").y("cold_days")'
      }
    )
    .step(
      "Granularity: merge decades into periods",
      hotCold.rollup("period"),
      {
        body: "The granularity scene merges multiple decade circles into one aggregate circle for each period.",
        authoring: 'hotCold.rollup("period")'
      }
    )
    .step(
      "Granularity: split periods back to decades",
      hotCold.breakdown("decade"),
      {
        body: "The granularity scene splits each aggregate period circle back into its decade circles using the period as parent identity.",
        authoring: 'hotCold.breakdown("decade")'
      }
    )
    .toSpec();
}

export function createScatterStory() {
  return createPointStory();
}
