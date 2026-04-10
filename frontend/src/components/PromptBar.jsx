import { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setPrompt, setIncludeInternal } from "../store/searchSlice";
import { useSearchStream } from "../hooks/useSearchStream";

const STYLE_CHIPS = [
  "Minimalist",
  "Brutalist",
  "Editorial",
  "Dark UI",
  "Glassmorphism",
  "Neumorphic",
  "Retro",
  "Futuristic",
  "Organic",
  "Geometric",
  "Photography",
  "Illustration",
  "3D Render",
  "Typography",
];

export default function PromptBar() {
  const dispatch = useDispatch();
  const { prompt, isSearching, includeInternal } = useSelector((s) => s.search);
  const { startSearch } = useSearchStream();
  const [focused, setFocused] = useState(false);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isSearching) return;
    startSearch(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const chipTimeoutRef = useRef(null);

  const appendChip = (chip) => {
    const current = prompt.trim();
    const next = current ? `${current}, ${chip.toLowerCase()}` : chip.toLowerCase();
    dispatch(setPrompt(next));

    // Debounce the search triggering by 600ms
    if (chipTimeoutRef.current) {
      clearTimeout(chipTimeoutRef.current);
    }
    chipTimeoutRef.current = setTimeout(() => {
      startSearch(next);
    }, 600);
  };

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-2 sm:px-0 pt-10 pb-2 lg:pt-12 lg:pb-4">
      {/* Search input */}
      <div
        className="relative flex items-center rounded-full transition-all duration-300 min-h-[3.5rem]"
        style={{
          background: "#161616",
          border: `1.5px solid ${focused ? "rgba(245,166,35,0.5)" : "rgba(255,255,255,0.06)"}`,
          boxShadow: focused
            ? "0 0 0 4px rgba(245,166,35,0.08), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Search icon */}
        <div className="pl-6 pr-3 flex-shrink-0">
          <svg
            className="w-5 h-5 transition-colors duration-300"
            style={{ color: focused ? "#f5a623" : "#6b6560" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>

        <input
          id="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => dispatch(setPrompt(e.target.value))}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe what inspires you..."
          disabled={isSearching}
          className="flex-1 py-5 pr-2 bg-transparent text-base md:text-[1.05rem] outline-none placeholder:text-[#6b6560] disabled:opacity-50"
          style={{ color: "#f0ede8", fontFamily: "var(--font-ui)" }}
        />

        {/* Submit button / loading state */}
        <div className="pr-4 flex-shrink-0">
          {isSearching ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(245,166,35,0.1)" }}>
              <span className="pulse-dot inline-block w-2 h-2 rounded-full" style={{ background: "#f5a623" }} />
              <span className="text-sm font-medium" style={{ color: "#f5a623" }}>
                Searching
              </span>
            </div>
          ) : (
            <button
              id="search-button"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: prompt.trim()
                  ? "linear-gradient(135deg, #f5a623, #e8941a)"
                  : "rgba(255,255,255,0.06)",
                color: prompt.trim() ? "#0a0a0a" : "#6b6560",
                boxShadow: prompt.trim() ? "0 4px 16px rgba(245,166,35,0.3)" : "none",
              }}
            >
              Search
            </button>
          )}
        </div>
      </div>

      {/* Layout footer: style chips & internal library toggle */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mt-8 lg:mt-10 gap-6 lg:gap-8">
        {/* Style chips */}
        <div className="flex flex-wrap gap-2.5 md:gap-3 flex-1">
          {STYLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => appendChip(chip)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium tracking-wide cursor-pointer
                         transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#a8a29e",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(245,166,35,0.1)";
                e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)";
                e.currentTarget.style.color = "#f5a623";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#a8a29e";
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Toggle switch for Internal DB */}
        <label className="flex items-center gap-3 cursor-pointer shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a8a29e" }}>
            Internal Library
          </span>
          <div className="relative">
            <input 
              type="checkbox"
              className="sr-only"
              checked={includeInternal}
              onChange={(e) => dispatch(setIncludeInternal(e.target.checked))}
            />
            <div 
              className={`block w-10 h-6 rounded-full transition-colors duration-300 ${includeInternal ? "" : "bg-white/10"}`}
              style={{ background: includeInternal ? "#f5a623" : "" }}
            ></div>
            <div 
              className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300`}
              style={{ transform: includeInternal ? "translateX(16px)" : "translateX(0)" }}
            ></div>
          </div>
        </label>
      </div>
    </div>
  );
}
