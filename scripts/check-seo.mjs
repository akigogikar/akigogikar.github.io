import fs from "node:fs";
import path from "node:path";

try {
  const root = path.resolve(import.meta.dirname, "..");
  const pages = ["index.html", "press/index.html"];
  const errors = [];

  // ponytail: regex is enough for two hand-authored static pages; use an HTML
  // parser if the site moves to templates or starts accepting untrusted HTML.
  for (const relative of pages) {
    const file = path.join(root, relative);
    const html = fs.readFileSync(file, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.trim();
    const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;

    if (!title || title.length > 60) errors.push(`${relative}: title missing or longer than 60 characters`);
    if (!description || description.length < 100 || description.length > 160) {
      errors.push(`${relative}: meta description must be 100-160 characters`);
    }
    if (!canonical?.startsWith("https://akigogikar.com/")) errors.push(`${relative}: invalid canonical URL`);
    if (h1Count !== 1) errors.push(`${relative}: expected exactly one h1, found ${h1Count}`);

    for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      try {
        JSON.parse(match[1]);
      } catch (error) {
        errors.push(`${relative}: invalid JSON-LD (${error instanceof Error ? error.message : String(error)})`);
      }
    }

    for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const raw = match[1]?.split(/[?#]/, 1)[0] ?? "";
      if (!raw || raw === "/") continue;
      const local = path.join(root, raw.replace(/^\//, ""));
      const exists = fs.existsSync(local) || fs.existsSync(path.join(local, "index.html"));
      if (!exists) errors.push(`${relative}: missing local target ${raw}`);
    }
  }

  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  if (!robots.includes("Sitemap: https://akigogikar.com/sitemap.xml")) errors.push("robots.txt: sitemap declaration missing");

  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  for (const page of ["https://akigogikar.com/", "https://akigogikar.com/press/"]) {
    if (!sitemap.includes(`<loc>${page}</loc>`)) errors.push(`sitemap.xml: missing ${page}`);
  }

  const jsonld = JSON.parse(fs.readFileSync(path.join(root, "jsonld.json"), "utf8"));
  if (!Array.isArray(jsonld?.["@graph"]) || jsonld["@graph"].length < 4) errors.push("jsonld.json: expected WebSite, ProfilePage, Person, and ScholarlyArticle nodes");

  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const embedded = JSON.parse(index.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] ?? "null");
  const publicJsonld = Object.fromEntries(Object.entries(jsonld ?? {}).filter(([key]) => !key.startsWith("_")));
  if (JSON.stringify(embedded) !== JSON.stringify(publicJsonld)) errors.push("index.html: embedded JSON-LD differs from jsonld.json");

  if (errors.length) {
    console.error(errors.map((error) => `FAIL ${error}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`PASS ${pages.length} pages, robots.txt, sitemap.xml, local links, and JSON-LD`);
  }
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.stack : String(error)}`);
  process.exitCode = 1;
}
