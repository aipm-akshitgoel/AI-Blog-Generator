/** Browser-like headers for fetching customer sites (many WAFs block obvious bots). */
export const WEBSITE_FETCH_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function websiteFetchHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
        "User-Agent": WEBSITE_FETCH_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...extra,
    };
}
