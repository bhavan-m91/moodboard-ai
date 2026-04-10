import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import ImageCard from "./ImageCard";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorMessage from "./ErrorMessage";
import { setError } from "../store/searchSlice";

export default function ResultsGrid() {
  const dispatch = useDispatch();
  const { images, isSearching, error } = useSelector((s) => s.search);
  const hasResults = images.length > 0;
  
  const [limit, setLimit] = useState(40);

  /* ── Error state ─────────────────────────────────── */
  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => {
          // Clear error locally or trigger a reload if we maintained previous prompt scope
          dispatch(setError(null));
        }} 
      />
    );
  }

  /* ── Empty state ─────────────────────────────────── */
  if (!hasResults && !isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-24 lg:py-32 w-full">
        <div className="text-center max-w-lg space-y-8">
          {/* Decorative gradient orb */}
          <div
            className="mx-auto w-32 h-32 rounded-full opacity-40 blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(245,166,35,0.3), transparent 70%)",
            }}
          />
          <h2
            className="text-3xl md:text-5xl font-medium -mt-16 tracking-tight"
            style={{
              fontFamily: "var(--font-heading)",
              color: "#f0ede8",
            }}
          >
            Describe what inspires you
          </h2>
          <p className="text-base leading-relaxed max-w-md mx-auto" style={{ color: "#78716c" }}>
            Search across Unsplash, Behance, Dribbble, internal collections and the web —
            AI tags and organises every result automatically.
          </p>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ────────────────────────────── */
  if (isSearching && !hasResults) {
    return <LoadingSkeleton />;
  }

  /* ── Results masonry ─────────────────────────────── */
  const visibleImages = images.slice(0, limit);

  return (
    <div className="flex-1 w-full max-w-[1720px] mx-auto px-6 sm:px-8 lg:px-14 py-10 lg:py-12">
      {/* Result count */}
      <div className="flex flex-wrap items-center gap-4 mb-10 lg:mb-12">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#78716c" }}>
          {images.length} result{images.length !== 1 ? "s" : ""}
        </p>
        {isSearching && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,166,35,0.08)" }}>
            <span className="pulse-dot inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#f5a623" }} />
            <span className="text-xs font-medium" style={{ color: "#f5a623" }}>
              Streaming more…
            </span>
          </div>
        )}
      </div>

      <div className="masonry-grid">
        {visibleImages.map((img, i) => (
          <div key={img.id} className="break-inside-avoid">
            <ImageCard image={img} index={i} />
          </div>
        ))}
      </div>
      
      {images.length > limit && (
        <div className="flex justify-center mt-14">
          <button
            onClick={() => setLimit(limit + 40)}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0ede8",
            }}
          >
            Load More Images
          </button>
        </div>
      )}
    </div>
  );
}
