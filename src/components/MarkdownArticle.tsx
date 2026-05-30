import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdownTables } from "@/lib/markdownStructure";

type MarkdownArticleProps = {
    children: string;
    className?: string;
};

/** Published / preview markdown with GFM tables, lists, and links. */
export function MarkdownArticle({ children, className }: MarkdownArticleProps) {
    const source = normalizeMarkdownTables(String(children || ""));
    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    table: ({ children: tableChildren, ...props }) => (
                        <div className="my-6 overflow-x-auto">
                            <table {...props}>{tableChildren}</table>
                        </div>
                    ),
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}
