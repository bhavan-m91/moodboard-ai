import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setProjectName,
  removeFromWishlist,
  toggleSidebar,
  updateItemNotes,
} from "../store/wishlistSlice";
import { proxiedImageUrl } from "../utils/imageSrc";

export default function WishlistSidebar() {
  const dispatch = useDispatch();
  const { projectName, items, isOpen } = useSelector((s) => s.wishlist);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) {
      dispatch(setProjectName(trimmed));
    } else {
      setNameValue(projectName);
    }
    setEditingName(false);
  };

  const handleExport = () => {
    console.log("[MoodBoard AI] Export to Figma — stub", items);
  };

  return (
    <>
      {/* Toggle button — always visible */}
      <div className="fixed right-4 top-4 z-50">
        <button
          id="wishlist-toggle"
          onClick={() => dispatch(toggleSidebar())}
          className="relative p-2.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: isOpen ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${isOpen ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.08)"}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ color: isOpen ? "#f5a623" : "#a8a29e" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {items.length > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "#f5a623", color: "#0a0a0a" }}
            >
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 right-0 h-full z-40 flex flex-col transition-transform duration-300 ease-out w-full md:w-[320px]"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          background: "#111111",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#f5a623" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {editingName ? (
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameValue(projectName);
                    setEditingName(false);
                  }
                }}
                className="bg-transparent border-b text-sm font-semibold outline-none min-w-0 flex-1"
                style={{ color: "#f0ede8", borderColor: "#f5a623" }}
              />
            ) : (
              <button
                onClick={() => {
                  setNameValue(projectName);
                  setEditingName(true);
                }}
                className="text-sm font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: "#f0ede8" }}
                title="Click to rename"
              >
                {projectName}
              </button>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2 cursor-pointer"
          >
            <svg className="w-4 h-4" style={{ color: "#6b6560" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <svg className="w-7 h-7" style={{ color: "#6b6560" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#6b6560" }}>
                Pin images from search results to build your board
              </p>
            </div>
          ) : (
            items.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                onRemove={() => dispatch(removeFromWishlist(item.id))}
                onNotesChange={(notes) => dispatch(updateItemNotes({ id: item.id, notes }))}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Primary Action - Plugin Link */}
            <button
              onClick={() => {
                alert("To use the Figma plugin, load your project name into the MoodBoard AI plugin inside Figma.");
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f5a623, #e8941a)",
                color: "#0a0a0a",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9c0-.28.22-.5.5-.5s.5.22.5.5v9c0 .28-.22.5-.5.5s-.5-.22-.5-.5z"/> {/* fake icon */}
              </svg>
              Open in Figma Plugin
            </button>
            <div className="flex gap-2">
              {/* Secondary Action - Export Data */}
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
                  const downloadAnchorNode = document.createElement("a");
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute("download", `${projectName}-moodboard.json`);
                  document.body.appendChild(downloadAnchorNode);
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                }}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#d6d3d1",
                }}
              >
                Download JSON
              </button>
              
              {/* Tertiary Action - Copy URLs */}
              <button
                onClick={() => {
                  const urls = items
                    .map((i) => i.url || i.image_result?.url)
                    .filter(Boolean)
                    .join("\n");
                  navigator.clipboard.writeText(urls);
                  alert("Image URLs copied to clipboard!");
                }}
                className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#d6d3d1",
                }}
              >
                Copy URLs
              </button>
            </div>
            <p className="text-[10px] text-center mt-3" style={{ color: "#6b6560" }}>
              {items.length} image{items.length !== 1 ? "s" : ""} in board
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

/* ── Individual wishlist card ────────────────────────── */
function WishlistItemCard({ item, onRemove, onNotesChange }) {
  const [showNotes, setShowNotes] = useState(false);

  const img = item.image_result || item;
  const platformLabel = img.source_platform || "web";
  const rawThumb = img.thumbnail_url || img.url || "";
  const thumbSrc = rawThumb.startsWith("/") ? rawThumb : proxiedImageUrl(rawThumb);

  return (
    <div
      className="rounded-xl overflow-hidden group"
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Thumbnail */}
      <div className="relative">
        <img
          src={thumbSrc}
          alt={img.title || ""}
          className="w-full h-32 object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {/* Platform badge */}
        <span
          className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider"
          style={{ background: "rgba(0,0,0,0.7)", color: "#a8a29e" }}
        >
          {platformLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-medium truncate" style={{ color: "#e0ddd8" }}>
          {img.title}
        </p>
        {img.caption && (
          <p className="text-[10px] line-clamp-2" style={{ color: "#6b6560" }}>
            {img.caption}
          </p>
        )}

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-[10px] font-medium cursor-pointer"
          style={{ color: "#f5a623" }}
        >
          {showNotes ? "Hide notes" : "Add notes"}
        </button>

        {showNotes && (
          <textarea
            value={item.notes || ""}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="w-full text-[11px] p-2 rounded-lg outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#f0ede8",
            }}
          />
        )}
      </div>
    </div>
  );
}
