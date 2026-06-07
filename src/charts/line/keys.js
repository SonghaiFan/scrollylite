import { keyAccessor } from "../../identity/semantic-key.js?v=semantic-key-1";

export function linePointKeyAccessor(spec, fallbackField = "id") {
  return keyAccessor(spec, fallbackField);
}

export function lineSeriesKey(series) {
  return series.key;
}
