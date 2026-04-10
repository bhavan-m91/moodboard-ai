import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addToWishlist, removeFromWishlist } from "../store/wishlistSlice";
import { buildImageSrcCandidates } from "../utils/imageSrc";

/* ── Platform icons (inline SVG) ─────────────────────── */
const PLATFORM_ICONS = {
  unsplash: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M7.5 6.75V0h9v6.75h-9zm9 3.75H24V24H0V10.5h7.5v6.75h9V10.5z" />
    </svg>
  ),
  behance: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.96.26 1.68.72 2.17 1.37s.73 1.44.73 2.36c0 .75-.15 1.39-.44 1.89-.3.5-.7.9-1.21 1.19-.51.29-1.09.5-1.74.62-.65.12-1.32.18-2.01.18H0V4.51h6.938v-.007zM6.545 10.16c.6 0 1.09-.15 1.47-.45.38-.3.57-.73.57-1.3 0-.31-.06-.57-.17-.78-.12-.21-.28-.38-.48-.51-.2-.13-.44-.23-.71-.28-.27-.06-.56-.09-.87-.09H3.72v3.41h2.825zm.185 5.235c.34 0 .66-.04.96-.1.3-.07.56-.18.78-.34.22-.16.4-.37.53-.64.13-.27.19-.6.19-1 0-.79-.22-1.35-.66-1.69-.44-.34-1.02-.51-1.74-.51H3.72v4.28h3.01zM15.28 4.14h6.26v1.72h-6.26V4.14zm7.5 5.82c.36.44.6.94.72 1.5h-5.9c.07-.68.35-1.2.82-1.55.48-.36 1.05-.54 1.73-.54.74 0 1.32.2 1.72.54l.9.05zm1.22 3.22c-.08.33-.24.64-.48.93-.24.29-.56.535-.97.73-.41.195-.92.295-1.54.295-.61 0-1.13-.09-1.55-.28-.42-.19-.77-.44-1.04-.76-.27-.32-.47-.69-.59-1.1-.12-.42-.19-.86-.2-1.32h8.58c.02-.83-.07-1.6-.27-2.32-.2-.72-.51-1.35-.94-1.88-.43-.53-.96-.95-1.6-1.25-.64-.3-1.39-.45-2.25-.45-.81 0-1.55.15-2.2.45-.66.3-1.22.7-1.69 1.22-.47.52-.83 1.12-1.09 1.82-.26.7-.38 1.44-.38 2.23 0 .81.13 1.57.39 2.26.26.7.63 1.3 1.1 1.82.48.52 1.05.92 1.72 1.22.67.3 1.42.45 2.25.45.98 0 1.83-.21 2.55-.63.72-.42 1.25-1.11 1.59-2.07h-2.37l.03-.02z" />
    </svg>
  ),
  dribbble: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.82zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702C16.86 2.61 14.545 1.62 12 1.62c-.83 0-1.634.1-2.4.285v.147zm10.14 3.205c-.21.288-1.89 2.478-5.67 4.023.247.5.487 1.012.706 1.53.078.18.154.363.228.543 3.388-.425 6.75.26 7.08.33-.02-2.42-.88-4.64-2.345-6.42z" />
    </svg>
  ),
  web: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
};

const MOOD_COLORS = {
  calm: "#4ECDC4",
  energetic: "#FF6B6B",
  luxurious: "#D4AF37",
  playful: "#FF9FF3",
  corporate: "#74B9FF",
  rebellious: "#E84393",
  romantic: "#FD79A8",
  technical: "#81ECEC",
};

function clampAspect(ar) {
  const n = Number(ar);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(1.85, Math.max(0.55, n));
}

export default function ImageCard({ image, index = 0 }) {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((s) => s.wishlist.items);
  const isWishlisted = wishlistItems.some((i) => i.id === image.id);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const candidates = useMemo(
    () => buildImageSrcCandidates(image.thumbnail_url, image.url),
    [image.thumbnail_url, image.url]
  );

  const currentSrc = candidates[srcIndex] || "";

  useEffect(() => {
    setSrcIndex(0);
    setImgLoaded(false);
    setLoadFailed(false);
  }, [image.id, image.thumbnail_url, image.url]);

  useEffect(() => {
    if (!currentSrc) {
      setLoadFailed(true);
    }
  }, [currentSrc]);

  const handleImgError = () => {
    if (srcIndex < candidates.length - 1) {
      setSrcIndex((i) => i + 1);
      setImgLoaded(false);
    } else {
      setLoadFailed(true);
      setImgLoaded(false);
    }
  };

  const toggleWishlist = (e) => {
    e.stopPropagation();
    if (isWishlisted) {
      dispatch(removeFromWishlist(image.id));
    } else {
      dispatch(addToWishlist(image));
    }
  };

  const openSource = (e) => {
    e.stopPropagation();
    if (image.source_link) {
      window.open(image.source_link, "_blank", "noopener");
    }
  };

  const moodColor = MOOD_COLORS[image.mood] || "#a8a29e";
  const ar = clampAspect(image.aspect_ratio);
  const eager = index < 12;

  return (
    <div
      className="card-enter relative group rounded-2xl overflow-hidden cursor-pointer shadow-lg shadow-black/20"
      style={{
        animationDelay: `${index * 45}ms`,
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative w-full overflow-hidden bg-[#121212]"
        style={{ aspectRatio: String(ar) }}
      >
        {!imgLoaded && !loadFailed && (
          <div className="absolute inset-0 shimmer z-[1]" aria-hidden />
        )}

        {loadFailed && (
          <div
            className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 px-4 text-center"
            style={{ background: "#141414" }}
          >
            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: "#78716c" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] leading-snug" style={{ color: "#78716c" }}>
              Preview blocked — open source to view
            </span>
          </div>
        )}

        {currentSrc && !loadFailed && (
          <img
            key={currentSrc}
            src={currentSrc}
            alt={image.title || "Mood board image"}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => {
              setImgLoaded(true);
              setLoadFailed(false);
            }}
            onError={handleImgError}
            className="absolute inset-0 z-[3] h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out"
            style={{
              opacity: imgLoaded ? 1 : 0,
              transform: hovered ? "scale(1.03)" : "scale(1)",
            }}
          />
        )}

        <div
          className="absolute inset-0 z-[4] flex flex-col justify-end transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: hovered ? 1 : 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
          }}
        >
          <div className="p-4 pt-12 space-y-3 pointer-events-auto">
            {image.caption && (
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#e8e4df" }}>
                {image.caption}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {(image.tags || []).slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide"
                  style={{ background: "rgba(245,166,35,0.2)", color: "#f5d78a" }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {image.color_palette?.length > 0 && (
              <div className="flex items-center gap-2">
                {image.color_palette.slice(0, 5).map((hex, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-full border border-white/25 shadow-sm"
                    style={{ background: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {image.mood && image.tagging_complete && (
          <div
            className="absolute top-3 right-3 z-[5] px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-opacity duration-300"
            style={{
              background: `${moodColor}24`,
              color: moodColor,
              border: `1px solid ${moodColor}55`,
              opacity: hovered ? 1 : 0.75,
            }}
          >
            {image.mood}
          </div>
        )}

        {image.source_platform === "internal" ? (
          <div
            className="absolute top-3 left-3 z-[5] px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200"
            style={{
              background: "rgba(245,166,35,0.22)",
              backdropFilter: "blur(8px)",
              color: "#f5a623",
              border: "1px solid rgba(245,166,35,0.45)",
              opacity: hovered ? 1 : 0.65,
            }}
            title="Sourced from Internal Library"
          >
            Internal
          </div>
        ) : (
          <button
            type="button"
            onClick={openSource}
            className="absolute top-3 left-3 z-[5] p-2 rounded-xl transition-all duration-200 hover:scale-110 cursor-pointer"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              color: "#f0ede8",
              opacity: hovered ? 1 : 0.55,
            }}
            title={`View on ${image.source_platform}`}
          >
            {PLATFORM_ICONS[image.source_platform] || PLATFORM_ICONS.web}
          </button>
        )}

        <button
          type="button"
          onClick={toggleWishlist}
          className="absolute bottom-3 right-3 z-[5] p-2.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            background: isWishlisted ? "rgba(245,166,35,0.25)" : "rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            opacity: hovered || isWishlisted ? 1 : 0,
          }}
          title={isWishlisted ? "Remove from board" : "Add to board"}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" strokeWidth={2}>
            {isWishlisted ? (
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#f5a623" stroke="none" />
            ) : (
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="#f0ede8" />
            )}
          </svg>
        </button>

        {!image.tagging_complete && image.url && (
          <div className="absolute bottom-0 left-0 right-0 h-1 shimmer z-[5]" style={{ opacity: 0.65 }} />
        )}
      </div>

      <div className="px-4 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "#a8a29e" }} title={image.title}>
          {image.title}
        </p>
      </div>
    </div>
  );
}
