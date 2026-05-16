const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".xml", ".tsv"];
const MAX_FILE_BYTES = 512_000;
const MAX_CHARS_PER_FILE = 20_000;

export function isBriefFileSupported(file: File): boolean {
    const name = file.name.toLowerCase();
    return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function extractBriefFileText(file: File): Promise<string> {
    if (file.size > MAX_FILE_BYTES) {
        throw new Error(`${file.name} is too large (max ${Math.round(MAX_FILE_BYTES / 1024)}KB).`);
    }
    if (!isBriefFileSupported(file)) {
        throw new Error(
            `${file.name}: unsupported type. Use .txt, .md, .csv, or .json — or paste key facts in the notes field.`,
        );
    }
    const text = await file.text();
    if (text.length > MAX_CHARS_PER_FILE) {
        return text.slice(0, MAX_CHARS_PER_FILE) + "\n\n[…truncated for length]";
    }
    return text;
}
