// Server-side only — do NOT import in client components
//
// Blog admin lives on payroll (hq.viralon.in) but blogs are rendered on the
// main site (viralon.in) — a different deployment with its own filesystem.
// So images are saved locally here AND returned as an ABSOLUTE url pointing
// back at this app's own public base url, instead of a relative path.
// That way an <img src="..."> rendered on the main site's domain still
// resolves correctly, no shared disk / cross-service call required.
import fs   from "fs";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "blogs");

// Domain that still serves the OLD viralon-new admin's blog images
// (its saveImage() returned relative "/api/images/<blogId>__<field>" URLs,
// served from viralon-new's own disk by its pages/api/images/[id].js).
// Any blog created before this migration has coverImage/cardImage src values
// in that shape — resolving fine on viralon-new's own origin, but 404ing when
// rendered here on payroll's different origin. We rewrite them to absolute
// URLs pointing at viralon-new's deployment so old posts keep displaying
// correctly in the payroll admin UI, without touching the stored DB values.
//
// DOMAIN PLAN: the new website (viralon-new) currently lives on the temporary
// subdomain admin.viralon.in; once fully ready it moves to the prime domain
// viralon.in — flip this constant to "https://viralon.in" at that point.
// (hq.viralon.in = this payroll/backend app; unrelated to this constant.)
const LEGACY_IMAGE_HOST = "https://admin.viralon.in";

export function normalizeImageSrc(src) {
  if (typeof src !== "string") return src;
  if (src.startsWith("/api/images/")) {
    return `${LEGACY_IMAGE_HOST}${src}`;
  }
  // Self-hosted upload whose absolute URL was minted under a different base
  // (e.g. saved locally with the wrong port, or before a domain change):
  // the file lives on THIS app's disk, so re-point the host at the current base.
  const selfHosted = src.match(/^https?:\/\/[^/]+(\/uploads\/blogs\/.+)$/);
  if (selfHosted) {
    return `${getBaseUrl()}${selfHosted[1]}`;
  }
  return src;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getExt(contentType) {
  const map = {
    "image/jpeg":    "jpg",
    "image/jpg":     "jpg",
    "image/png":     "png",
    "image/webp":    "webp",
    "image/svg+xml": "svg",
    "image/gif":     "gif",
  };
  return map[contentType] || "jpg";
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Saves a base64 data URI to /public/uploads/blogs/<safeName>.<ext>
 * Returns an absolute URL (https://hq.viralon.in/uploads/blogs/<file>) —
 * served directly as a static file by Next.js, and safe to embed on any domain.
 */
export async function saveImage(base64, blogId, name) {
  if (!base64 || !base64.startsWith("data:")) return null;
  const match = base64.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;

  try {
    const contentType = match[1];
    const buffer      = Buffer.from(match[2], "base64");
    const ext         = getExt(contentType);

    ensureDir(UPLOADS_ROOT);

    // Strip any existing extension from name to avoid double-extension (e.g. foo.webp.webp)
    const nameNoExt = (name || "image").replace(/\.[^.]+$/, "");

    const safeName = `${blogId}__${nameNoExt}`
      .replace(/[^a-z0-9_-]/gi, "_")   // keep only alphanumeric, dash, underscore
      .replace(/__+/g, "__")             // collapse multiple underscores
      .slice(0, 120);

    const filename = `${safeName}.${ext}`;
    const filepath = path.join(UPLOADS_ROOT, filename);

    fs.writeFileSync(filepath, buffer);

    // Absolute — must work when rendered from the main site's domain, not just here.
    return `${getBaseUrl()}/uploads/blogs/${filename}`;
  } catch (e) {
    console.error("[saveImage] Filesystem save failed:", e.message);
    return base64;
  }
}
