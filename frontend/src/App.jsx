import { useSelector } from "react-redux";
import PromptBar from "./components/PromptBar";
import ResultsGrid from "./components/ResultsGrid";
import WishlistSidebar from "./components/WishlistSidebar";
import ChatBar from "./components/ChatBar";

export default function App() {
  const isSidebarOpen = useSelector((s) => s.wishlist.isOpen);
  const projectName = useSelector((s) => s.wishlist.projectName);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Main Content Area */}
      <main
        className="flex flex-col flex-1 relative transition-all duration-300"
        style={{
          // On desktop, pad right edge so content isn't under sidebar if open
          paddingRight: isSidebarOpen ? "320px" : "0",
        }}
      >
        {/* Header */}
        <header
          className="flex-shrink-0 z-20 w-full border-b border-white/[0.04]"
          style={{ background: "rgba(10,10,10,0.72)", backdropFilter: "blur(16px)" }}
        >
          <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 sm:px-8 lg:px-14 py-7 lg:py-8">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg"
              style={{
                background: "linear-gradient(135deg, #f5a623, #e8941a)",
                color: "#0a0a0a",
                fontFamily: "var(--font-heading)",
              }}
            >
              M
            </div>
            <div>
              <h1
                className="text-2xl md:text-[1.65rem] leading-tight font-semibold tracking-tight"
                style={{ color: "#f5f2ec", fontFamily: "var(--font-heading)" }}
              >
                MoodBoard AI
              </h1>
              <p className="text-[11px] mt-2 font-semibold tracking-[0.18em] uppercase" style={{ color: "#78716c" }}>
                {projectName}
              </p>
            </div>
          </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "120px" }}>
          <div className="max-w-[1720px] mx-auto w-full">
            <PromptBar />
          </div>
          <ResultsGrid />
        </div>

        {/* Floating Chat Mode Component */}
        <ChatBar />
      </main>

      {/* Sidebar Overlay/Docked */}
      <WishlistSidebar />
    </div>
  );
}
