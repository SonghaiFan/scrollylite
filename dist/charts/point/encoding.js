export function colorField(encoding = {}) {
  return channelField(encoding.color);
}

export function channelField(channel = null) {
  if (!channel) return null;
  if (typeof channel === "string") return channel;
  if (channel.field) return channel.field;

  for (const key of ["hue", "luminance", "saturation", "opacity"]) {
    if (channel[key]?.field) return channel[key].field;
  }

  return null;
}
