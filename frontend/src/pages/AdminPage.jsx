import { useState, useEffect } from "react"
import { ShaderAnimation } from "@/components/shader-animation"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function AdminPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docsError, setDocsError] = useState(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState("") // "", "uploading", "success", "error"
  const [uploadError, setUploadError] = useState("")

  // Tracks loading status per document key: e.g. { "policy.pdf": "deleting" | "summarizing" }
  const [actionLoading, setActionLoading] = useState({})

  const handleUnlock = () => {
    setIsVerifying(true)
    setPasswordError("")
    
    // Simulate verification delay
    setTimeout(() => {
      if (passwordInput === "aiesec2024") {
        setIsAuthenticated(true)
        setIsVerifying(false)
      } else {
        setPasswordError("Incorrect password")
        setIsVerifying(false)
      }
    }, 1500)
  }

  const fetchDocuments = () => {
    setLoadingDocs(true)
    setDocsError(null)
    fetch(`${API_BASE_URL}/documents`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to load documents.")
        }
        return res.json()
      })
      .then(data => {
        setDocuments(data)
        setLoadingDocs(false)
      })
      .catch(err => {
        console.error(err)
        setDocsError("Could not load documents. Is the backend running?")
        setLoadingDocs(false)
      })
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments()
    }
  }, [isAuthenticated])

  const handleUpload = () => {
    if (!selectedFile) {
      setUploadStatus("error")
      setUploadError("Please select a PDF file first.")
      return
    }

    setUploadStatus("uploading")
    setUploadError("")
    
    const formData = new FormData()
    formData.append("file", selectedFile)

    fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || "Upload failed.")
          })
        }
        return res.json()
      })
      .then(() => {
        setUploadStatus("success")
        setSelectedFile(null)
        const fileInput = document.getElementById("admin-file-input")
        if (fileInput) fileInput.value = ""
        fetchDocuments()
      })
      .catch(err => {
        console.error(err)
        setUploadStatus("error")
        setUploadError(err.message || "Upload failed.")
      })
  }

  const handleDelete = (filename) => {
    setActionLoading(prev => ({ ...prev, [filename]: "deleting" }))
    fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to delete document.")
        }
        return res.json()
      })
      .then(() => {
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
        fetchDocuments()
      })
      .catch(err => {
        console.error(err)
        alert(`Error deleting document: ${err.message}`)
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
      })
  }

  const handleSummarize = (filename) => {
    setActionLoading(prev => ({ ...prev, [filename]: "summarizing" }))
    fetch(`${API_BASE_URL}/documents/summarize/${encodeURIComponent(filename)}`, {
      method: "POST",
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to generate summary.")
        }
        return res.json()
      })
      .then(() => {
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
        fetchDocuments()
      })
      .catch(err => {
        console.error(err)
        alert(`Error summarizing document: ${err.message}`)
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
      })
  }

  // 1. PASSWORD GATE
  if (!isAuthenticated) {
    return (
      <div
        className="relative flex items-center justify-center h-full w-full p-6 text-white font-sans overflow-hidden"
        style={{ background: "#0d0d1a" }}
      >
        {isVerifying ? (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
            <ShaderAnimation />
          </div>
        ) : (
          <div
            className="w-full max-w-md p-8 rounded-2xl border border-white/5 flex flex-col gap-6 shadow-2xl"
            style={{ background: "#1a1a3e" }}
          >
            <div className="text-center">
              <span className="text-4xl block mb-3">🔒</span>
              <h2 className="text-2xl font-bold tracking-tight">Admin Gate</h2>
              <p className="text-xs text-white/50 mt-1">Please authenticate to manage policy files</p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleUnlock()
                }}
                placeholder="Enter admin password"
                className="w-full px-4 h-12 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#c1ff72] focus:border-[#c1ff72] transition-all bg-[#0d0d1a]/50 text-white placeholder:text-white/30"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              />
              <button
                onClick={handleUnlock}
                className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: "#c1ff72",
                  color: "#0d0d1a",
                }}
              >
                Unlock
              </button>
              {passwordError && (
                <p className="text-xs font-semibold text-red-400 mt-1 text-center">{passwordError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2. MAIN PANEL
  return (
    <div
      className="h-full w-full overflow-y-auto text-white p-8 font-sans"
      style={{ background: "#0d0d1a" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-[13px] mt-1" style={{ color: "#9999bb" }}>
              Manage documents, summaries, and ingestion
            </p>
          </div>
        </header>

        {/* Upload and Ingest Component */}
        <div
          className="p-6 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-lg"
          style={{ background: "#1a1a3e" }}
        >
          <h3 className="text-lg font-semibold tracking-tight">Upload &amp; Index Document</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <input
              id="admin-file-input"
              type="file"
              accept=".pdf"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0])
                }
              }}
              className="flex-1 text-sm bg-[#0d0d1a]/50 p-2.5 rounded-xl border cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            />
            <button
              onClick={handleUpload}
              disabled={uploadStatus === "uploading"}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#c1ff72",
                color: "#0d0d1a",
              }}
            >
              {uploadStatus === "uploading" ? "Uploading..." : "Upload & Ingest"}
            </button>
          </div>

          {uploadStatus === "success" && (
            <p className="text-xs text-[#c1ff72] font-semibold mt-1">Upload successful! Ingestion is processing in the background (refresh to see chunks update).</p>
          )}
          {uploadStatus === "error" && (
            <p className="text-xs text-red-400 font-semibold mt-1">Upload failed: {uploadError}</p>
          )}
        </div>

        {/* System Documents Table */}
        <div
          className="p-6 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-lg overflow-hidden"
          style={{ background: "#1a1a3e" }}
        >
          <h3 className="text-lg font-semibold tracking-tight">System Documents</h3>

          {loadingDocs && (
            <div className="flex justify-center items-center py-12">
              <p className="text-sm text-white/80 animate-pulse">Loading document catalog...</p>
            </div>
          )}

          {docsError && (
            <div className="flex justify-center items-center py-12">
              <p className="text-sm text-red-400 font-medium">{docsError}</p>
            </div>
          )}

          {!loadingDocs && !docsError && documents.length === 0 && (
            <div className="flex justify-center items-center py-12 text-center">
              <p className="text-sm" style={{ color: "#9999bb" }}>
                No documents uploaded to index yet.
              </p>
            </div>
          )}

          {!loadingDocs && !docsError && documents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase" style={{ color: "#9999bb" }}>
                    <th className="py-3 px-4 font-semibold">Filename</th>
                    <th className="py-3 px-4 font-semibold text-center">Summary</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documents.map((doc, idx) => {
                    const status = actionLoading[doc.filename]
                    const isDeleting = status === "deleting"
                    const isSummarizing = status === "summarizing"
                    const isAnyLoading = !!status

                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-4 font-medium text-white max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate block">{doc.filename}</span>
                            <span className="text-xs font-normal" style={{ color: "#9999bb" }}>
                              Indexed: {doc.chunks} chunks
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {doc.has_summary ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#c1ff72]/15 text-[#c1ff72]">
                              Summary ✓
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Summarize Action */}
                            <button
                              onClick={() => handleSummarize(doc.filename)}
                              disabled={isAnyLoading}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                color: isSummarizing ? "#ffffff" : "#c1ff72",
                                borderColor: isSummarizing ? "rgba(255,255,255,0.2)" : "#c1ff72",
                                background: isSummarizing ? "rgba(255,255,255,0.05)" : "rgba(193,255,114,0.05)"
                              }}
                            >
                              {isSummarizing ? "Working..." : "Generate Summary"}
                            </button>

                            {/* Delete Action */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${doc.filename}?`)) {
                                  handleDelete(doc.filename)
                                }
                              }}
                              disabled={isAnyLoading}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e05555]/10"
                              style={{
                                color: "#e05555",
                                borderColor: "#e05555",
                                background: "rgba(224,85,85,0.05)"
                              }}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
