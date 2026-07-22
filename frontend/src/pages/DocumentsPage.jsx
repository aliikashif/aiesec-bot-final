import { useState, useEffect } from "react"
import { ShaderAnimation } from "@/components/shader-animation"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const PORTFOLIO_META = {
  finance_legal: { label: "Finance & Legal", icon: "" },
  business_development: { label: "Business Development", icon: "" },
  exchange: { label: "Exchange", icon: "" },
  mxp: { label: "MXP", icon: "" },
}

const getPortfolioMeta = (key) =>
  PORTFOLIO_META[key] || { label: key, icon: "" }

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePortfolio, setActivePortfolio] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/documents`)
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
    window.open(`${API_BASE_URL}/documents/download/${encodeURIComponent(filename)}`, "_blank")
  }

  const filteredDocs = documents.filter(doc => doc.portfolio === activePortfolio)

  return (
    <div
      className="relative h-full w-full overflow-y-auto text-[#0d0d1a] p-4 sm:p-8 font-sans"
      style={{ background: "#FCFBF4" }}
    >
      {loading ? (
        <div className="absolute inset-0 z-40 bg-black flex items-center justify-center overflow-hidden">
          <ShaderAnimation />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[#140586] tracking-tight">
              {activePortfolio ? `${getPortfolioMeta(activePortfolio).label} Documents` : "Documents"}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
              {activePortfolio ? `All documents stored under the ${getPortfolioMeta(activePortfolio).label} portfolio` : "All policy documents available to the bot grouped by portfolio"}
            </p>
          </header>

          {error && (
            <div className="flex justify-center items-center py-20 text-center">
              <p className="text-sm font-medium text-red-500">{error}</p>
            </div>
          )}

          {!error && activePortfolio === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              {[...new Set(documents.map(d => d.portfolio))].map((portfolioKey) => {
                const meta = getPortfolioMeta(portfolioKey)
                return (
                  <button
                    key={portfolioKey}
                    onClick={() => setActivePortfolio(portfolioKey)}
                    className="flex items-center gap-4 p-6 rounded-2xl border border-[#140586]/10 hover:border-[#63B2FB]/40 transition-all duration-150 text-left shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer"
                    style={{ background: "#ffffff" }}
                  >
                    {meta.icon && <span className="text-3xl">{meta.icon}</span>}
                    <div>
                      <h3 className="font-bold text-base text-[#140586]">{meta.label}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {documents.filter(d => d.portfolio === portfolioKey).length} document(s)
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!error && activePortfolio !== null && (
            <div className="animate-fade-in">
              <button
                onClick={() => setActivePortfolio(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#140586] hover:text-[#63B2FB] transition-colors duration-150 mb-5 cursor-pointer"
              >
                ← Back to folders
              </button>

              {filteredDocs.length === 0 ? (
                <div className="flex justify-center items-center py-20 text-center border border-dashed border-[#140586]/10 rounded-2xl">
                  <p className="text-sm font-medium" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
                    No documents in this portfolio yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocs.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-5 rounded-xl border border-[#140586]/10 transition-all duration-150 hover:bg-slate-50 shadow-sm"
                      style={{ background: "#ffffff" }}
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          onClick={() => handleDownload(doc.filename)}
                          className="font-semibold text-sm text-slate-800 cursor-pointer hover:underline hover:text-[#63B2FB]"
                        >
                          {doc.filename.split("/").pop().replace(/\.pdf$/i, "")}
                        </span>
                        <div className="flex items-center gap-3 text-xs" style={{ color: "#9999bb" }}>
                          {doc.has_summary ? (
                            <span className="font-bold text-[#16a34a]">Summary ✓</span>
                          ) : (
                            <span className="opacity-60">No summary</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(doc.filename)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer hover:bg-[#63B2FB] hover:text-white"
                        style={{
                          color: "#140586",
                          borderColor: "rgba(20, 5, 134, 0.2)",
                          background: "rgba(99, 178, 251, 0.1)"
                        }}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
