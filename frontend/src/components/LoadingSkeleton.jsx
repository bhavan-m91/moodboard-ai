export default function LoadingSkeleton() {
  const heights = [220, 280, 200, 320, 240, 260, 300, 190];

  return (
    <div className="flex-1 w-full max-w-[1720px] mx-auto px-6 sm:px-8 lg:px-14 py-10 lg:py-12">
      <div className="masonry-grid">
        {Array.from({ length: 8 }).map((_, i) => {
          const h = heights[i % heights.length];
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden card-enter break-inside-avoid shadow-lg shadow-black/15"
              style={{
                animationDelay: `${i * 55}ms`,
                background: "var(--bg-card)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="shimmer w-full" style={{ height: `${h}px` }} />
              <div className="px-4 py-3.5 space-y-2.5">
                <div className="shimmer rounded-full h-2.5" style={{ width: "75%" }} />
                <div className="shimmer rounded-full h-2" style={{ width: "48%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
