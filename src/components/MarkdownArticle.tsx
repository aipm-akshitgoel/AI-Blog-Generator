import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    markdownTableToHtml,
    normalizeMarkdownTables,
    splitMarkdownPreservingStructure,
} from "@/lib/markdownStructure";

type MarkdownArticleProps = {
    children: string;
    className?: string;
};

const tableWrapper = ({ children: tableChildren, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto">
        <table {...props}>{tableChildren}</table>
    </div>
);

function GfmTableBlock({ markdown }: { markdown: string }) {
    const html = markdownTableToHtml(markdown);
    if (!html) {
        return (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: tableWrapper }}>
                {markdown}
            </ReactMarkdown>
        );
    }
    return (
        <div
            className="my-6 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

/** Published / preview markdown with GFM tables, lists, and links. */
export function MarkdownArticle({ children, className }: MarkdownArticleProps) {
    const source = normalizeMarkdownTables(String(children || ""));
    const parts = splitMarkdownPreservingStructure(source);

    return (
        <div className={className}>
            {parts.map((part, index) => {
                if (part.type === "table") {
                    return <GfmTableBlock key={`table-${index}`} markdown={part.text} />;
                }
                return (
                    <ReactMarkdown
                        key={`md-${index}`}
                        remarkPlugins={[remarkGfm]}
                        components={{ table: tableWrapper }}
                    >
                        {part.text}
                    </ReactMarkdown>
                );
            })}
        </div>
    );
}
