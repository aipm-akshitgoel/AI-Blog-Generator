import type { SeoDefaults } from "@/lib/types/businessContext";

/** Default Flesch-Kincaid ceiling — plain professional (≈9th–10th grade). */
export const DEFAULT_READABILITY_TARGET_GRADE_MAX = 10;

export const READABILITY_TARGET_GRADE_MIN = 6;
export const READABILITY_TARGET_GRADE_MAX = 12;

export const READABILITY_TARGET_GRADE_OPTIONS: { value: number; label: string }[] = [
    { value: 6, label: "6th grade — very easy" },
    { value: 7, label: "7th grade — easy" },
    { value: 8, label: "8th grade — accessible" },
    { value: 9, label: "9th grade — plain professional" },
    { value: 10, label: "10th grade — professional (default)" },
    { value: 11, label: "11th grade — advanced" },
    { value: 12, label: "12th grade — technical" },
];

export function normalizeReadabilityTargetGrade(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_READABILITY_TARGET_GRADE_MAX;
    return Math.min(
        READABILITY_TARGET_GRADE_MAX,
        Math.max(READABILITY_TARGET_GRADE_MIN, Math.round(n)),
    );
}

export function resolveReadabilityTargetGrade(seoDefaults?: SeoDefaults | null): number {
    return normalizeReadabilityTargetGrade(seoDefaults?.readabilityTargetGradeMax);
}

export function meetsReadabilityTarget(gradeLevel: number, targetMax?: number): boolean {
    const ceiling = normalizeReadabilityTargetGrade(targetMax);
    return gradeLevel <= ceiling;
}

export function formatTargetGradeLabel(targetMax: number): string {
    const n = normalizeReadabilityTargetGrade(targetMax);
    const mod100 = n % 100;
    const mod10 = n % 10;
    const suffix =
        mod100 >= 11 && mod100 <= 13
            ? "th"
            : mod10 === 1
              ? "st"
              : mod10 === 2
                ? "nd"
                : mod10 === 3
                  ? "rd"
                  : "th";
    return `${n}${suffix} grade`;
}

/** Bar fill: at or below target = high; each grade over target reduces fill. */
export function readabilityGradeBarPercent(gradeLevel: number, targetMax?: number): number {
    const target = normalizeReadabilityTargetGrade(targetMax);
    if (gradeLevel <= target) {
        return Math.min(100, Math.max(72, 100 - Math.max(0, target - gradeLevel) * 4));
    }
    const over = gradeLevel - target;
    return Math.max(8, 72 - over * 14);
}

export function normalizeSeoDefaultsFromDb(raw: unknown): SeoDefaults | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const rec = raw as Record<string, unknown>;
    const out: SeoDefaults = {};
    if (typeof rec.defaultPostCategory === "string" && rec.defaultPostCategory.trim()) {
        out.defaultPostCategory = rec.defaultPostCategory.trim();
    }
    if (rec.defaultSchemaType === "Article" || rec.defaultSchemaType === "BlogPosting") {
        out.defaultSchemaType = rec.defaultSchemaType;
    }
    if (typeof rec.canonicalBaseUrl === "string") {
        out.canonicalBaseUrl = rec.canonicalBaseUrl.trim();
    }
    if (typeof rec.includeFaqSchemaByDefault === "boolean") {
        out.includeFaqSchemaByDefault = rec.includeFaqSchemaByDefault;
    }
    if (rec.readabilityTargetGradeMax != null) {
        out.readabilityTargetGradeMax = normalizeReadabilityTargetGrade(rec.readabilityTargetGradeMax);
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function seoDefaultsToDbValue(seoDefaults?: SeoDefaults): Record<string, unknown> | null {
    if (!seoDefaults) return null;
    const out: Record<string, unknown> = {};
    if (seoDefaults.defaultPostCategory?.trim()) {
        out.defaultPostCategory = seoDefaults.defaultPostCategory.trim();
    }
    if (seoDefaults.defaultSchemaType) out.defaultSchemaType = seoDefaults.defaultSchemaType;
    if (seoDefaults.canonicalBaseUrl?.trim()) {
        out.canonicalBaseUrl = seoDefaults.canonicalBaseUrl.trim();
    }
    if (typeof seoDefaults.includeFaqSchemaByDefault === "boolean") {
        out.includeFaqSchemaByDefault = seoDefaults.includeFaqSchemaByDefault;
    }
    if (seoDefaults.readabilityTargetGradeMax != null) {
        out.readabilityTargetGradeMax = normalizeReadabilityTargetGrade(
            seoDefaults.readabilityTargetGradeMax,
        );
    }
    return Object.keys(out).length > 0 ? out : null;
}
