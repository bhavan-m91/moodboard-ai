/**
 * Build ordered list of image URLs to try (direct first, then same via API proxy).
 * Behance and other CDNs often block <img> when Referer is localhost — proxy fixes that.
 */
export function proxiedImageUrl(url) {
  if (!url || url.startsWith("/")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export function buildImageSrcCandidates(thumbnailUrl, fullUrl) {
  const thumb = thumbnailUrl || fullUrl || "";
  const full = fullUrl || thumbnailUrl || "";
  const out = [];
  const push = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };
  push(thumb);
  push(full);
  push(proxiedImageUrl(thumb));
  if (full !== thumb) push(proxiedImageUrl(full));
  return out;
}
