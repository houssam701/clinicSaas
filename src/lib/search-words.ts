/**
 * Helpers for free-text search in repositories: the text is split into words
 * and every word must match somewhere (case-insensitive, anywhere in the
 * field), so word order and partial words both work.
 */

/** At most this many words are used, to keep the query small. */
const MAX_WORDS = 5;

/** Escapes LIKE wildcards so typed % and _ match literally. */
export const likeEscape = (text: string) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** "  sara  hadd " → ["%sara%", "%hadd%"]: one ILIKE pattern per word. */
export function searchPatterns(text: string | undefined): string[] {
  return (text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS)
    .map((word) => `%${likeEscape(word)}%`);
}
