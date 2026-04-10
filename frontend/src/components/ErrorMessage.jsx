export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 w-full animate-fade-in">
      <div className="text-center max-w-md space-y-4">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.1)", boxShadow: "0 8px 32px rgba(239,68,68,0.15)" }}
        >
          <svg className="w-8 h-8" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mt-2" style={{ color: "#f0ede8" }}>Something went wrong</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a8a29e" }}>
            {error}
          </p>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0ede8",
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
