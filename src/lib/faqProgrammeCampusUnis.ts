/**
 * TalentEdge prod campus cluster (programme tiles default to that origin unless
 * `FAQ_<TILE>_UPSTREAM_BASE` is set): each programme uni maps to one public `www.*` host (live URL enrichment)
 * and one `X-Tenant-Key` (same string as `id`).
 */

export const PROGRAMME_CAMPUS_UNIS = [
  {
    id: "upgradsolutions",
    wwwHost: "www.upgradsolutions.com",
    label: "Upgrad Solutions",
    tileLogoUrl: "https://pages.talentedge.dev/favicon__2_-5_1774440952086_1d6de782acae239b.webp",
  },
  {
    id: "pwc",
    wwwHost: "www.onlineprogrammes.pwc.in",
    label: "PwC Online Programmes",
    /** PwC mark (public domain text logo on Wikimedia; programme homepage asset not used when host is unreachable). */
    tileLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f1/PwC_2025_Logo.svg",
  },
  {
    id: "alliance",
    wwwHost: "www.onlinealliance.in",
    label: "Online Alliance",
    /** Header mark from live `www.onlinealliance.in` (TalentEdge pages CDN). */
    tileLogoUrl: "https://pages.talentedge.dev/Alliance_Logo_1778135262744_8d8054775fd2e8b4.png",
  },
  {
    id: "langchain_co_in",
    wwwHost: "www.langchain.co.in",
    label: "LangChain (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/logo-langchain.co.in_1777444715600_82c3ed27e104d0e1.png",
  },
  {
    id: "langchain_biz",
    wwwHost: "www.langchain.biz",
    label: "LangChain (.biz)",
    /** Same header mark family as `www.langchain.co.in`. */
    tileLogoUrl: "https://pages.talentedge.dev/logo-langchain.co.in_1777444715600_82c3ed27e104d0e1.png",
  },
  {
    id: "deep_learning_co_in",
    wwwHost: "www.deep-learning.co.in",
    label: "Deep Learning (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/DeepLearning_AI_Courses_Banner_1777442290481_ff495907aefd9039.webp",
  },
  {
    id: "deeplearningcourse_co_in",
    wwwHost: "www.deeplearningcourse.co.in",
    label: "Deep Learning Course (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/Deep_Learning_Course_Banner_1777447243711_7a11c06146f4e442.webp",
  },
  {
    id: "deeplearningcourse_online",
    wwwHost: "www.deeplearningcourse.online",
    label: "Deep Learning Course (.online)",
    tileLogoUrl: "https://pages.talentedge.dev/Deep_Learning_Courses_Logo_1778500638117_be796b1e8b74f3e0.png",
  },
  {
    id: "nlpcourse_online",
    wwwHost: "www.nlpcourse.online",
    label: "NLP Course (.online)",
    tileLogoUrl: "https://pages.talentedge.dev/NLP_courses_banner_1777545005881_6cee0162ec194482.webp",
  },
  {
    id: "nlpcourse_co_in",
    wwwHost: "www.nlpcourse.co.in",
    label: "NLP Course (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/NLP_COURSES_ONLINE_BANNER_1777544894931_0b4c1ade2f056567.webp",
  },
  {
    id: "nlpcourse_ai",
    wwwHost: "www.nlpcourse.ai",
    label: "NLP Course (.ai)",
    tileLogoUrl: "https://pages.talentedge.dev/NLP_Courses_Logo_1778499811333_5d6079f218f6c7b2.png",
  },
  {
    id: "naturallanguageprogramming_in",
    wwwHost: "www.naturallanguageprogramming.in",
    label: "Natural Language Programming",
    tileLogoUrl: "https://pages.talentedge.dev/Gemini_Generated_Image_isgy1zisgy1zisgy__1__1777352723392_04506347f1ff6b46.webp",
  },
  {
    id: "promptengineeringcourse_in",
    wwwHost: "www.promptengineeringcourse.in",
    label: "Prompt Engineering Course (.in)",
    tileLogoUrl: "https://pages.talentedge.dev/prompt_engineering_course.in_Logo_1777877410821_87584ca11e6aa562.webp",
  },
  {
    id: "promptengineeringcourse_co_in",
    wwwHost: "www.promptengineeringcourse.co.in",
    label: "Prompt Engineering Course (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/AI_Prompt_Engineering_course_logo_1778498062789_dcb3b47b009154b7.png",
  },
  {
    id: "agenticaicourse_com",
    wwwHost: "www.agenticaicourse.com",
    label: "Agentic AI Course (.com)",
    /** `.com` host may be parked; same programme mark as `.in`. */
    tileLogoUrl: "https://pages.talentedge.dev/Agentic_AI_Courses.in_Logo_1778583275530_70578039c4103544.webp",
  },
  {
    id: "agenticaicourse_in",
    wwwHost: "www.agenticaicourse.in",
    label: "Agentic AI Course (.in)",
    tileLogoUrl: "https://pages.talentedge.dev/Agentic_AI_Courses.in_Logo_1778583275530_70578039c4103544.webp",
  },
  {
    id: "agenticaicourse_online",
    wwwHost: "www.agenticaicourse.online",
    label: "Agentic AI Course (.online)",
    tileLogoUrl: "https://pages.talentedge.dev/ChatGPT_Image_May_11__2026__10_16_56_AM-removebg-p_1778474895319_4c874264f3770194.webp",
  },
  {
    id: "agenticaicourse_co_in",
    wwwHost: "www.agenticaicourse.co.in",
    label: "Agentic AI Course (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/Gemini_Generated_Image_btniw4btniw4btni-removebg-p_1778488049288_5d35c2a9d07af64c.webp",
  },
  {
    id: "aipromptengineering_online",
    wwwHost: "www.aipromptengineering.online",
    label: "AI Prompt Engineering (.online)",
    tileLogoUrl: "https://pages.talentedge.dev/prompt_engineering_certifications_logo_1778564155284_e5c7375408c6cf11.png",
  },
  {
    id: "aipromptengineering_co_in",
    wwwHost: "www.aipromptengineering.co.in",
    label: "AI Prompt Engineering (.co.in)",
    tileLogoUrl: "https://pages.talentedge.dev/Learn_prompt_engineering_logo_1778587652881_d82ef8667c409cc7.webp",
  },
  {
    id: "aipromptengineering_ai",
    wwwHost: "www.aipromptengineering.ai",
    label: "AI Prompt Engineering (.ai)",
    /** SSR shell has no image URLs; same first-fold mark as `.online`. */
    tileLogoUrl: "https://pages.talentedge.dev/prompt_engineering_certifications_logo_1778564155284_e5c7375408c6cf11.png",
  },
  {
    id: "onlineatlas_in",
    wwwHost: "www.onlineatlas.in",
    label: "Online Atlas",
    /** Header SVG from `https://atlasonline.edu.in/` (Next static `logo.*.svg`). */
    tileLogoUrl: "https://atlasonline.edu.in/_next/static/media/logo.2c50c66c.svg",
  },
] as const;

export type ProgrammeCampusUniId = (typeof PROGRAMME_CAMPUS_UNIS)[number]["id"];

export type ProgrammeCampusUniRow = (typeof PROGRAMME_CAMPUS_UNIS)[number];

/** Optional header-style logo URL when present on the row (`as const` union omits the field on other members). */
export function programmeTileLogoUrl(row: ProgrammeCampusUniRow): string | undefined {
  return "tileLogoUrl" in row ? row.tileLogoUrl : undefined;
}

const ID_SET = new Set<string>(PROGRAMME_CAMPUS_UNIS.map((u) => u.id));

export function isProgrammeCampusUniId(value: unknown): value is ProgrammeCampusUniId {
  return typeof value === "string" && ID_SET.has(value);
}

/** `FAQ_<KEY>_USERNAME` / `_PASSWORD` / `_UPSTREAM_BASE` / `_LIVE_BASE_URL` / `_X_TENANT_KEY` */
export function programmeUniEnvKey(id: ProgrammeCampusUniId | string): string {
  return String(id)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");
}

/** Upstream `X-Tenant-Key` matches programme id for all rows in this registry. */
export function programmeCampusXTenantKey(id: ProgrammeCampusUniId): string {
  return id;
}

export function getProgrammeCampusUniMeta(id: ProgrammeCampusUniId): ProgrammeCampusUniRow {
  const row = PROGRAMME_CAMPUS_UNIS.find((u) => u.id === id);
  if (!row) throw new Error(`Unknown programme campus uni: ${id}`);
  return row;
}

/** Stable default password for local/demo (override per uni with `FAQ_<ENV>_PASSWORD`). */
export function defaultProgrammeCampusPassword(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const n = 600 + (h % 399);
  const compact = id.replace(/_/g, "").slice(0, 12) || "campus";
  return `pass@${compact}${n}`;
}
