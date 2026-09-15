import definitions from '../../shared/quote-services.json';
export const QUOTE_SERVICES = definitions;
export const isQuoteService = (value: unknown): value is string => typeof value === 'string' && QUOTE_SERVICES.some(s => s.id === value);
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Match recorded capabilities, never infer specialist work from a shop name.
export function recordedQuoteServices(capabilities: unknown): string[] {
  const text = ' ' + normalized(Array.isArray(capabilities) ? capabilities.join(' ') : String(capabilities || '')) + ' ';
  return QUOTE_SERVICES.filter(s => {
    // Shared words are not equivalent services: PPF is not paint/bodywork,
    // and steering-wheel work is not tire mounting.
    const scoped = s.id === 'paint-bodywork' ? text.replace(/\bpaint protection(?: film)?\b/g, ' ')
      : s.id === 'wheels-tires' ? text.replace(/\bsteering wheels?\b/g, ' ') : text;
    return s.aliases.some(alias => scoped.includes(' ' + normalized(alias) + ' '));
  }).map(s => s.id);
}
