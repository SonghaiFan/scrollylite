const FIELD_TITLE_OVERRIDES = {
    tmin: 'Min temperature',
    tmax: 'Max temperature'
};
export function titleize(value) {
    const raw = String(value ?? '');
    if (FIELD_TITLE_OVERRIDES[raw])
        return FIELD_TITLE_OVERRIDES[raw];
    const words = raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    return words
        .map((word, index) => {
        if (/^[A-Z0-9]+$/.test(word))
            return word;
        const lower = word.toLowerCase();
        return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
        .join(' ');
}
export function labelFromValue(value) {
    const text = String(value ?? '');
    return text.includes('_') || text.includes('-') ? titleize(text) : text;
}
