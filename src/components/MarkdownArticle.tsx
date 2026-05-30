import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownArticleProps = {
    children: string;
    className?: string;
};

/** Published / preview markdown with GFM tables, lists, and links. */
export function MarkdownArticle({ children, className }: MarkdownArticleProps) {
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
                {children}
            </ReactMarkdown>
        </div>
    );
}
