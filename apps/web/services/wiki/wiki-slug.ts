/** Safe path segment for Obsidian note filenames. */
export function wikiSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 80) || "untitled";
}

/** Obsidian wikilink target (no .md extension). */
export function wikiLink(path: string): string {
  return `[[${path}]]`;
}
