/**
 * Strips markdown code fences from a model response and parses JSON.
 *
 * Haiku 4.5 occasionally wraps JSON output in ```json ... ``` fences
 * despite system prompt instructions otherwise. This helper handles both
 * fenced and unfenced responses, plus any whitespace.
 *
 * Throws if the cleaned text is not valid JSON.
 */
export function parseModelJson<T = unknown>(raw: string): T {
  let cleaned = raw.trim();

  // Strip leading ```json or ``` fence
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
  }

  // Strip trailing ``` fence
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }

  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
