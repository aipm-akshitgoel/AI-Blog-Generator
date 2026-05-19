import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { FactSource } from "@/lib/types/factSource";
import { resolveSourcePositionsInDoc } from "@/lib/factCitations";
import { FactCitationChip } from "@/components/FactCitationChip";

export type FactCitationDecorationOptions = {
    sources: FactSource[];
    enabled: boolean;
    onRemoveSource?: (id: string) => void;
};

export type FactCitationDecorationsConfig = {
    getCitationOptions: () => FactCitationDecorationOptions;
};

const pluginKey = new PluginKey("factCitationDecorations");
const chipRoots = new Map<string, Root>();

function destroyChipRoots() {
    for (const root of chipRoots.values()) {
        root.unmount();
    }
    chipRoots.clear();
}

function buildDecorationSet(
    doc: Parameters<typeof resolveSourcePositionsInDoc>[0],
    options: FactCitationDecorationOptions,
): DecorationSet {
    if (!options.enabled || !options.sources.length) {
        destroyChipRoots();
        return DecorationSet.empty;
    }

    destroyChipRoots();
    const positioned = resolveSourcePositionsInDoc(doc, options.sources);
    if (positioned.length === 0) return DecorationSet.empty;

    const decorations: Decoration[] = [];

    positioned.forEach((source, i) => {
        const index = i + 1;
        decorations.push(
            Decoration.inline(source.from, source.to, {
                class: "fact-citation-highlight",
                nodeName: "span",
            }),
        );

        decorations.push(
            Decoration.widget(
                source.to,
                () => {
                    const mount = document.createElement("span");
                    mount.className = "fact-citation-chip-mount";
                    mount.contentEditable = "false";
                    const root = createRoot(mount);
                    chipRoots.set(`${source.id}-${index}`, root);
                    root.render(
                        createElement(FactCitationChip, {
                            index,
                            source,
                            onRemove: options.onRemoveSource
                                ? () => options.onRemoveSource!(source.id)
                                : undefined,
                        }),
                    );
                    return mount;
                },
                {
                    side: 1,
                    key: `fact-cite-${source.id}`,
                },
            ),
        );
    });

    return DecorationSet.create(doc, decorations);
}

export const FactCitationDecorations = Extension.create<FactCitationDecorationsConfig>({
    name: "factCitationDecorations",

    addOptions() {
        return {
            getCitationOptions: () => ({ sources: [], enabled: false }),
        };
    },

    addProseMirrorPlugins() {
        const getOptions = () => this.options.getCitationOptions();

        return [
            new Plugin({
                key: pluginKey,
                state: {
                    init: (_, state) => buildDecorationSet(state.doc, getOptions()),
                    apply: (tr, oldSet, _oldState, newState) => {
                        if (
                            tr.docChanged ||
                            tr.getMeta(pluginKey) === "refresh" ||
                            tr.getMeta("factCitationRefresh")
                        ) {
                            return buildDecorationSet(newState.doc, getOptions());
                        }
                        return oldSet.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return pluginKey.getState(state);
                    },
                },
                destroy: () => {
                    destroyChipRoots();
                },
            }),
        ];
    },
});

export function refreshFactCitationDecorations(editor: {
    view: { dispatch: (tr: import("@tiptap/pm/state").Transaction) => void; state: import("@tiptap/pm/state").EditorState };
}): void {
    const tr = editor.view.state.tr.setMeta(pluginKey, "refresh");
    editor.view.dispatch(tr);
}
