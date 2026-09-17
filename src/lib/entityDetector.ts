import { Entity } from '@/types';

export interface DetectedEntityMatch {
  entity: Entity;
  matchedName: string;
  count: number;
}

export interface EntityHighlightSegment {
  text: string;
  isEntity: boolean;
  entity?: Entity;
}

/**
 * Escapes regex special characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Efficiently detects which entities are mentioned in the given text.
 * Runs in O(Text Length * Entities) with word-boundary awareness.
 */
export function detectEntitiesInText(
  text: string,
  entities: Entity[]
): DetectedEntityMatch[] {
  if (!text || entities.length === 0) return [];

  const results: DetectedEntityMatch[] = [];

  for (const entity of entities) {
    // Check main name and any non-empty aliases
    const namesToCheck = [entity.name, ...(entity.aliases || [])]
      .map(n => n.trim())
      .filter(n => n.length >= 2); // Avoid matching 1-letter noise

    if (namesToCheck.length === 0) continue;

    let totalCount = 0;
    let matchedName = entity.name;

    for (const name of namesToCheck) {
      try {
        // Use word boundary if alphanumeric, otherwise fallback to simple match
        const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi');
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          totalCount += matches.length;
          matchedName = matches[0]; // first occurrence casing
        }
      } catch (e) {
        // Fallback for non-standard characters
        if (text.toLowerCase().includes(name.toLowerCase())) {
          totalCount += 1;
        }
      }
    }

    if (totalCount > 0) {
      results.push({
        entity,
        matchedName,
        count: totalCount,
      });
    }
  }

  // Sort by highest mention count
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Splits text into segments for rendering with highlighted entity spans.
 * Only called when the user enables entity highlighting mode.
 */
export function segmentTextWithHighlights(
  text: string,
  entities: Entity[]
): EntityHighlightSegment[] {
  if (!text) return [];
  if (entities.length === 0) return [{ text, isEntity: false }];

  // Build a map of lowercase terms to their corresponding entity
  const termMap = new Map<string, Entity>();
  const terms: string[] = [];

  for (const entity of entities) {
    const names = [entity.name, ...(entity.aliases || [])]
      .map(n => n.trim())
      .filter(n => n.length >= 2);

    for (const name of names) {
      const lower = name.toLowerCase();
      if (!termMap.has(lower)) {
        termMap.set(lower, entity);
        terms.push(name);
      }
    }
  }

  if (terms.length === 0) return [{ text, isEntity: false }];

  // Sort terms by descending length so "Torre de Cristal" matches before "Torre"
  terms.sort((a, b) => b.length - a.length);

  const regex = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`, 'gi');
  const segments: EntityHighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];
    const matchEnd = matchStart + matchText.length;

    // Push preceding non-entity text
    if (matchStart > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchStart),
        isEntity: false,
      });
    }

    // Push matched entity
    const matchedEntity = termMap.get(matchText.toLowerCase());
    segments.push({
      text: matchText,
      isEntity: true,
      entity: matchedEntity,
    });

    lastIndex = matchEnd;
  }

  // Push remainder
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isEntity: false,
    });
  }

  return segments;
}
