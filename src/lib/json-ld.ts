export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const JSON_LD_SCRIPT_RE =
  /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>\s*([\s\S]*?)\s*<\/script>/gi;

export function splitEmbeddedJsonLd(markdown: string): { prose: string; graphs: unknown[] } {
  const graphs: unknown[] = [];
  const prose = markdown
    .replace(JSON_LD_SCRIPT_RE, (_full, raw: string) => {
      try {
        graphs.push(JSON.parse(String(raw)));
      } catch {
        /* strip even if unparseable */
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trimEnd();
  return { prose, graphs };
}
