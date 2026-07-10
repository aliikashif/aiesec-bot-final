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
  
  const [editingFilename, setEditingFilename] = useState(null)
  const [editValue, setEditValue] = useState("")

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState("") // "", "uploading", "success", "error"
  const [uploadError, setUploadError] = useState("")

  // Tracks loading status per document key: e.g. { "policy.pdf": "deleting" | "summarizing" }
  const [actionLoading, setActionLoading] = useState({})

  const handleResponse = (res) => {
    if (res.status === 401) {
      sessionStorage.removeItem("admin_token")
      setIsAuthenticated(false)
      throw new Error("Session expired. Please log in again.")
    }
    if (!res.ok) {
      return res.json().then(errData => {
        throw new Error(errData.error || "Request failed.")
      })
    }
    return res.json()
  }

  const getAuthHeaders = (extraHeaders = {}) => {
    const token = sessionStorage.getItem("admin_token")
    return {
      "Authorization": token ? `Bearer ${token}` : "",
      ...extraHeaders
    }
  }

  const handleUnlock = () => {
    setIsVerifying(true)
    setPasswordError("")

    fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: passwordInput }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || "Incorrect password")
        }
        return res.json()
      })
      .then((data) => {
        sessionStorage.setItem("admin_token", data.access_token)
        setIsAuthenticated(true)
        setIsVerifying(false)
      })
      .catch((err) => {
        console.error(err)
        setPasswordError(err.message || "Incorrect password")
        setIsVerifying(false)
      })
  }

  const fetchDocuments = () => {
    setLoadingDocs(true)
    setDocsError(null)
    fetch(`${API_BASE_URL}/documents`, {
      headers: getAuthHeaders()
    })
      .then(handleResponse)
      .then(data => {
        setDocuments(data)
        setLoadingDocs(false)
      })
      .catch(err => {
        console.error(err)
        setDocsError(err.message || "Could not load documents. Is the backend running?")
        setLoadingDocs(false)
      })
  }

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token")
    if (token) {
      setIsAuthenticated(true)
    }
  }, [])

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
      headers: getAuthHeaders(),
      body: formData,
    })
      .then(handleResponse)
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

  const handleRename = (filename) => {
    setActionLoading(prev => ({ ...prev, [filename]: "renaming" }))
    fetch(`${API_BASE_URL}/documents/display-name`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ filename, display_name: editValue })
    })
      .then(handleResponse)
      .then(() => {
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
        setEditingFilename(null)
        setEditValue("")
        fetchDocuments()
      })
      .catch(err => {
        console.error(err)
        alert(`Error renaming document: ${err.message}`)
        setActionLoading(prev => {
          const next = { ...prev }
          delete next[filename]
          return next
        })
      })
  }

  const handleDelete = (filename) => {
    setActionLoading(prev => ({ ...prev, [filename]: "deleting" }))
    fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then(handleResponse)
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
      headers: getAuthHeaders(),
    })
      .then(handleResponse)
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
        className="relative flex items-center justify-center h-full w-full p-6 text-[#0d0d1a] font-sans overflow-hidden"
        style={{ background: "#FCFBF4" }}
      >
        {isVerifying ? (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
            <ShaderAnimation />
          </div>
        ) : (
          <div
            className="w-full max-w-md p-8 rounded-2xl border border-[#140586]/10 flex flex-col gap-6 shadow-2xl"
            style={{ background: "#ffffff" }}
          >
            <div className="text-center">
              <span className="text-4xl block mb-3">🔒</span>
              <h2 className="text-2xl font-bold tracking-tight text-[#140586]">Admin Gate</h2>
              <p className="text-xs text-slate-500 mt-1">Please authenticate to manage policy files</p>
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
                className="w-full px-4 h-12 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#63B2FB] focus:border-[#63B2FB] transition-all bg-[#FCFBF4] text-[#0d0d1a] placeholder:text-slate-400"
                style={{ borderColor: "rgba(20, 5, 134, 0.15)" }}
              />
              <button
                onClick={handleUnlock}
                className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: "#63B2FB",
                  color: "#ffffff",
                }}
              >
                Unlock
              </button>
              {passwordError && (
                <p className="text-xs font-semibold text-red-500 mt-1 text-center">{passwordError}</p>
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
      className="h-full w-full overflow-y-auto text-[#0d0d1a] p-4 sm:p-8 font-sans"
      style={{ background: "#FCFBF4" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#140586] tracking-tight">Admin Panel</h1>
            <p className="text-[13px] mt-1" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
              Manage documents, summaries, and ingestion
            </p>
          </div>
        </header>

        {/* Upload and Ingest Component */}
        <div
          className="p-6 rounded-2xl border border-[#140586]/10 flex flex-col gap-4 shadow-lg"
          style={{ background: "#ffffff" }}
        >
          <h3 className="text-lg font-semibold tracking-tight text-[#140586]">Upload &amp; Index Document</h3>

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
              className="flex-1 text-sm bg-[#FCFBF4] p-2.5 rounded-xl border cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-[#140586] hover:file:bg-slate-200 transition-all text-[#0d0d1a]"
              style={{ borderColor: "rgba(20, 5, 134, 0.15)" }}
            />
            <button
              onClick={handleUpload}
              disabled={uploadStatus === "uploading"}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#63B2FB",
                color: "#ffffff",
              }}
            >
              {uploadStatus === "uploading" ? "Uploading..." : "Upload & Ingest"}
            </button>
          </div>

          {uploadStatus === "success" && (
            <p className="text-xs text-[#c1ff72] font-semibold mt-1">Upload successful! Ingestion is processing in the background (refresh to see chunks update).</p>
          )}
          {uploadStatus === "error" && (
            <p className="text-xs text-red-500 font-semibold mt-1">Upload failed: {uploadError}</p>
          )}
        </div>

        {/* System Documents Table */}
        <div
          className="p-6 rounded-2xl border border-[#140586]/10 flex flex-col gap-4 shadow-lg overflow-hidden"
          style={{ background: "#ffffff" }}
        >
          <h3 className="text-lg font-semibold tracking-tight text-[#140586]">System Documents</h3>

          {loadingDocs && (
            <div className="flex justify-center items-center py-12">
              <p className="text-sm text-slate-500 animate-pulse">Loading document catalog...</p>
            </div>
          )}

          {docsError && (
            <div className="flex justify-center items-center py-12">
              <p className="text-sm text-red-500 font-medium">{docsError}</p>
            </div>
          )}

          {!loadingDocs && !docsError && documents.length === 0 && (
            <div className="flex justify-center items-center py-12 text-center">
              <p className="text-sm" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
                No documents uploaded to index yet.
              </p>
            </div>
          )}

          {!loadingDocs && !docsError && documents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
                    <th className="py-3 px-4 font-semibold">Filename</th>
                    <th className="py-3 px-4 font-semibold text-center">Summary</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc, idx) => {
                    const status = actionLoading[doc.filename]
                    const isDeleting = status === "deleting"
                    const isSummarizing = status === "summarizing"
                    const isRenaming = status === "renaming"
                    const isAnyLoading = !!status
                    const isEditing = editingFilename === doc.filename

                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-4 font-medium text-slate-800 max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            {isEditing ? (
                              <div className="flex items-center gap-2 w-full mt-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="flex-1 px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#63B2FB] text-slate-800 bg-[#FCFBF4]"
                                  placeholder="Enter custom display name..."
                                  disabled={isRenaming}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleRename(doc.filename)
                                    if (e.key === "Escape") setEditingFilename(null)
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleRename(doc.filename)}
                                  disabled={isRenaming}
                                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors cursor-pointer"
                                >
                                  {isRenaming ? "..." : "Save"}
                                </button>
                                <button
                                  onClick={() => setEditingFilename(null)}
                                  disabled={isRenaming}
                                  className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="truncate block font-semibold text-slate-800">
                                  {doc.display_name || doc.filename.split("/").pop().replace(/\.pdf$/i, "")}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingFilename(doc.filename)
                                    setEditValue(doc.display_name || doc.filename.split("/").pop().replace(/\.pdf$/i, ""))
                                  }}
                                  disabled={isAnyLoading}
                                  className="ml-2 text-slate-400 hover:text-[#63B2FB] transition-colors cursor-pointer inline-flex items-center"
                                  title="Rename display name"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            <span className="text-xs font-normal" style={{ color: "#9999bb" }}>
                              Path: {doc.filename} · Indexed: {doc.chunks} chunks
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {doc.has_summary ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a]">
                              Summary ✓
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
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
                                color: isSummarizing ? "rgba(20, 5, 134, 0.4)" : "#140586",
                                borderColor: isSummarizing ? "rgba(20, 5, 134, 0.15)" : "rgba(20, 5, 134, 0.2)",
                                background: isSummarizing ? "rgba(20, 5, 134, 0.05)" : "rgba(99, 178, 251, 0.1)"
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
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e05555] hover:text-white"
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
