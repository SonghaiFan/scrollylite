import { unit } from "../../../dist/index.js";
import { story } from "./shared.js";

export function createUnitStory({ actionMode = "stepper" } = {}) {
  const base = unit("weather")
    .x("year")
    .y("hot_days")
    .color({ field: "period", type: "nominal" })
    .key("decade")
    .value("hot_days")
    .label("decade")
    .sort("year");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Focus and Guide layouts on repeated count units. " +
      "Each circle is one hot day — guide changes how those circles are arranged."
    )
    .step(
      "Baseline: one unit per hot day",
      base,
      {
        body: "One circle per hot day, keyed by decade plus unit index. Color encodes period.",
        authoring: 'unit("weather").x("year").y("hot_days")\n  .color({ field: "period", type: "nominal" })\n  .key("decade").value("hot_days").label("decade").sort("year")'
      }
    )
    .step(
      "Focus: recent decades only",
      base.where({ period: "recent" }),
      {
        body: "Focus filters rows before unit expansion — fewer decades, same unit idiom.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: group units by period",
      base.group("period", { color: { field: "period", type: "nominal" } }),
      {
        body: "Guide changes the spatial layout — same circles now cluster by period.",
        authoring: 'base.group("period", { color: { field: "period", type: "nominal" } })'
      }
    )
    .step(
      "Guide: dodge along timeline",
      base.dodge("year"),
      {
        body: "Guide changes layout again — units spread along a collision-dodged year axis.",
        authoring: 'base.dodge("year")'
      }
    )
    .toSpec();
}
