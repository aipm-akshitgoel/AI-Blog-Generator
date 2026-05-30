import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/** HTML → markdown with GFM tables preserved. */
export function createTurndownService(): TurndownService {
    const service = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
    });
    service.use(gfm);
    return service;
}
