import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useChatStream } from "../hooks/useChatStream";
import { setChatExplanation } from "../store/searchSlice";

export default function ChatBar() {
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector((s) => s.wishlist.isOpen);
  const { prompt, queries, images, isSearching, chatExplanation } = useSelector((s) => s.search);
  const { startChat } = useChatStream();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (chatExplanation) {
      const timer = setTimeout(() => {
        dispatch(setChatExplanation(""));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chatExplanation, dispatch]);

  const hasSearched = prompt.trim() || queries.length > 0 || images.length > 0;
  
  if (!hasSearched) {
    return null; // hide entirely if no search has happened
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSearching) return;
    
    startChat(trimmed);
    setInputValue("");
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 pointer-events-none z-30 transition-[padding] duration-300 ${
        isSidebarOpen ? "md:pr-[320px]" : ""
      }`}
      style={{ paddingBottom: "32px", width: "100%" }}
    >
      <div className="max-w-3xl mx-auto px-4 flex flex-col items-center gap-3">
        
        {/* Toast / Explanation Banner */}
        {chatExplanation && (
          <div 
            className="pointer-events-auto px-4 py-2 rounded-full text-xs font-semibold shadow-lg card-enter"
            style={{ 
              background: "linear-gradient(135deg, rgba(245,166,35,0.2), rgba(232,148,26,0.1))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(245,166,35,0.3)",
              color: "#f5a623"
            }}
          >
            {chatExplanation}
          </div>
        )}

        {/* Input Form */}
        <form 
          onSubmit={handleSubmit}
          className="pointer-events-auto relative flex items-center w-full rounded-2xl transition-all duration-300"
          style={{
            background: "rgba(17, 17, 17, 0.8)",
            backdropFilter: "blur(16px)",
            border: `1.5px solid ${focused ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.1)"}`,
            boxShadow: focused 
              ? "0 0 0 4px rgba(245,166,35,0.1), 0 8px 32px rgba(0,0,0,0.4)" 
              : "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div className="pl-4 flex-shrink-0 flex items-center">
            <svg 
              className="w-5 h-5 transition-colors duration-300" 
              style={{ color: focused ? "#f5a623" : "#6b6560" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Refine search... e.g. 'More minimal' or 'Only dark ones'"
            disabled={isSearching}
            className="flex-1 py-4 px-3 bg-transparent text-sm outline-none placeholder:text-[#6b6560] disabled:opacity-50"
            style={{ color: "#f0ede8", fontFamily: "var(--font-ui)" }}
          />

          <div className="pr-2 flex-shrink-0">
            {isSearching ? (
              <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: "rgba(245,166,35,0.1)" }}>
                <span className="pulse-dot w-2 h-2 rounded-full" style={{ background: "#f5a623" }} />
              </div>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-sm transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: inputValue.trim() 
                    ? "rgba(245,166,35,0.15)"
                    : "rgba(255,255,255,0.06)",
                  color: inputValue.trim() ? "#f5a623" : "#6b6560",
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
