// Cloudflare Pages middleware: on the partner hosts (partner.* / stage-partner.*) the portal lives at the root, so
// "/clients" serves the static export of "/partner/clients". Every other host passes straight through.
// Keep PORTAL_SECTIONS in sync with src/lib/portal-path.ts.
const PORTAL_SECTIONS = ["clients", "demo", "team", "goal", "payouts", "profile"];
const PARTNER_HOST = /^(stage-)?partner\./;
const HAS_EXT = /\.[a-z0-9]+$/i;

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (!PARTNER_HOST.test(url.hostname)) return ctx.next();
  const path = url.pathname;

  // Old links with the /partner prefix: pages move to the clean path (files under /partner/, e.g. photos, stay).
  if (path === "/partner" || (path.startsWith("/partner/") && !HAS_EXT.test(path))) {
    const clean = path.slice("/partner".length) || "/";
    return Response.redirect(`${url.origin}${clean}${url.search}`, 301);
  }

  const first = path.split("/")[1] || "";
  let target = null;
  if (path === "/") target = "/partner/";
  else if (/^\/(index\.txt|__next\.[^/]+\.txt)$/.test(path)) target = `/partner${path}`; // RSC data of the root
  else if (PORTAL_SECTIONS.includes(first)) {
    if (path === `/${first}`) return Response.redirect(`${url.origin}/${first}/${url.search}`, 301);
    target = `/partner${path}`;
  }
  if (!target) return ctx.next();

  const rewritten = new URL(url);
  rewritten.pathname = target;
  return ctx.env.ASSETS.fetch(new Request(rewritten.toString(), ctx.request));
}
