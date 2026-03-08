export function sanitizeJsonString(raw: string): string {
    // 1. Remove markdown code block wrappers
    let clean = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    // 2. Escape literal newlines and tabs inside strings, remove other unescaped control characters
    return clean.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
        return match
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    });
}
