// Prerender the static shell (instant paint on every new tab). Widgets fetch
// their own data client-side from /api. Decided in eng review.
export const prerender = true;
export const ssr = true;
export const trailingSlash = 'never';
