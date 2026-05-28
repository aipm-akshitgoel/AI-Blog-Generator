/** Read-only keyword rows for collapsed "View TOC" panels */
export function TocKeywordList({ keywords, label }: { keywords: string[]; label: string }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">{label}</p>
            {keywords.length === 0 ? (
                <p className="text-xs text-neutral-600 italic pl-2.5">—</p>
            ) : (
                <ul className="space-y-1">
                    {keywords.map((kw) => (
                        <li
                            key={kw}
                            className="text-xs text-neutral-300 leading-snug pl-2.5 border-l border-neutral-700"
                        >
                            {kw}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
