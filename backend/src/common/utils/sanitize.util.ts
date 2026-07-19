import DOMPurify from 'isomorphic-dompurify';

export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br'],
    ALLOWED_ATTR: [],
  });
}
