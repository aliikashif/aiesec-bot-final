import { useState, useEffect } from "react"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch("http://localhost:8000/documents")
      .then(res => {
        if (!res.ok) {
          throw new Error("Could not load documents.")
        }
        return res.json()
      })
      .then(data => {
        setDocuments(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError("Could not load documents. Is the backend running?")
        setLoading(false)
      })
  }, [])

  const handleDownload = (filename) => {
    window.open("http://localhost:8000/documents/download/" + encodeURIComponent(filename), "_blank")
  }

  return (
    <div
      className="h-full w-full overflow-y-auto text-white p-8 font-sans"
      style={{ background: "#0d0d1a" }}
    >
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Documents</h1>
          <p className="text-[13px] mt-1" style={{ color: "#9999bb" }}>
            All policy documents available to the bot
          </p>
        </header>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <p className="text-sm text-white/80 animate-pulse">Loading documents...</p>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center py-20 text-center">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="flex justify-center items-center py-20 text-center">
            <p className="text-sm" style={{ color: "#9999bb" }}>
              No documents uploaded yet.
            </p>
          </div>
        )}

        {!loading && !error && documents.length > 0 && (
          <div className="space-y-4">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-5 rounded-xl transition-all duration-150 hover:bg-white/[0.02]"
                style={{ background: "#1a1a3e" }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-white">{doc.filename}</span>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#9999bb" }}>
                    <span>{doc.chunks} chunks</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    {doc.has_summary ? (
                      <span className="font-semibold text-[#c1ff72]">Summary ✓</span>
                    ) : (
                      <span className="opacity-60">No summary</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(doc.filename)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer hover:bg-[#c1ff72] hover:text-[#0d0d1a]"
                  style={{
                    color: "#c1ff72",
                    borderColor: "#c1ff72",
                    background: "rgba(193,255,114,0.05)"
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
