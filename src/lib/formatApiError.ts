/** Turn API / fetch error payloads into a readable string (avoids "[object Object]"). */
export function formatApiError(value: unknown, fallback = "Something went wrong"): string {
    if (value == null) return fallback;
    if (typeof value === "string") {
        const t = value.trim();
        return t || fallback;
    }
    if (value instanceof Error) {
        return value.message?.trim() || fallback;
    }
    if (typeof value === "object") {
        const o = value as Record<string, unknown>;
        if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
        if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
        if (o.error && typeof o.error === "object") {
            const inner = o.error as Record<string, unknown>;
            if (typeof inner.message === "string" && inner.message.trim()) return inner.message.trim();
            if (typeof inner.code === "string" && typeof inner.message === "string") {
                return `${inner.code}: ${inner.message}`;
            }
        }
        if (typeof o.details === "string" && o.details.trim()) return o.details.trim();
        try {
            const s = JSON.stringify(value);
            if (s && s !== "{}") return s.length > 320 ? `${s.slice(0, 320)}…` : s;
        } catch {
            /* ignore */
        }
    }
    return fallback;
}

export function extractRouteError(err: unknown, fallback: string): string {
    return formatApiError(err, fallback);
}
