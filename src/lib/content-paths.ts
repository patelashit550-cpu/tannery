import path from "path";

/** Markdown corpus at repo root (`ontology/**/*.md`, `ontology/**/*.mdx`). */
export const ONTOLOGY_ROOT = path.join(process.cwd(), "ontology");

/**
 * Public bento `href` paths (no leading slash) that do not match ontology layout 1:1.
 */
export const BENTO_ROUTE_ONTOLOGY: Record<string, string> = {
  "tannery/essays": "tannery/welcome",
};
