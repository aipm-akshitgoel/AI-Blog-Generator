import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import type { Extensions } from "@tiptap/core";
import {
    FactCitationDecorations,
    type FactCitationDecorationOptions,
} from "@/components/tiptap/FactCitationDecorations";

/** Shared TipTap schema for RichTextEditor and @tiptap/html generateJSON. */
export function createTiptapEditorExtensions(
    getCitationOptions: () => FactCitationDecorationOptions = () => ({
        sources: [],
        enabled: false,
    }),
): Extensions {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
            openOnClick: false,
            autolink: true,
        }),
        Image,
        Placeholder.configure({
            placeholder: "Start editing your optimized content here...",
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        FactCitationDecorations.configure({
            getCitationOptions,
        }),
    ];
}
