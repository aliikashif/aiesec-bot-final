import { useState, useRef, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ChatMessage from "@/components/ChatMessage"
import TypingIndicator from "@/components/TypingIndicator"
import SuggestedQuestions from "@/components/SuggestedQuestions"

// ─── Dummy initial messages ───────────────────────────────────────────────────
const INITIAL_MESSAGES = [
  {
    role: "user",
    content: "What's the reimbursement process?",
  },
  {
    role: "bot",
    content:
      "To get reimbursed, submit your receipts along with a filled reimbursement form to the team within 7 days of the expense.",
    confidence: "High",
    sources: ["reimbursement_policy.pdf", "finance_handbook.pdf"],
  },
]

// ─── Backend API ─────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // ─── Header ───────────────────────────────────────────────────────────────────
  function Header({ portfolio, setPortfolio }) {
    return (
      <header
        className="hidden md:flex items-center gap-3 px-5 py-3.5 shadow-lg flex-shrink-0 z-10"
        style={{ background: "#0F0464" }}
      >
        {/* Bot icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: "rgba(255, 255, 255, 0.12)", borderColor: "rgba(255, 255, 255, 0.15)" }}>
          <img src="/mascot-avatar-256.png" width="18" height="18" className="object-contain rounded-md" alt="Bot Avatar" />
        </div>

        <div>
          <h1 className="text-[#F5F5F0] font-bold text-sm leading-tight">AIESEC Assistant</h1>
          <p className="text-xs font-medium text-[#B8B8D9]">Ask me anything about AIESEC</p>
        </div>

        <select
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          className="ml-auto bg-white/10 text-[#F5F5F0] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#63B2FB] cursor-pointer"
        >
          <option value="finance_legal" className="bg-[#0F0464] text-[#F5F5F0]">Finance & Legal</option>
          <option value="business_development" className="bg-[#0F0464] text-[#F5F5F0]">Business Development</option>
          <option value="exchange" className="bg-[#0F0464] text-[#F5F5F0]">Exchange</option>
          <option value="mxp" className="bg-[#0F0464] text-[#F5F5F0]">MXP</option>
        </select>
      </header>
    )
  }

// ─── Send icon SVG ────────────────────────────────────────────────────────────
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [portfolio, setPortfolio] = useOutletContext()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingPortfolio, setPendingPortfolio] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const prevPortfolioRef = useRef(portfolio)

  // Clear messages when portfolio changes (with confirmation)
  useEffect(() => {
    if (portfolio !== prevPortfolioRef.current) {
      if (messages.length > 0) {
        setPendingPortfolio(portfolio)
        setShowConfirmModal(true)
        // Revert dropdown state back while modal is open so it matches previous
        setPortfolio(prevPortfolioRef.current)
      } else {
        prevPortfolioRef.current = portfolio
      }
    }
  }, [portfolio, messages, setPortfolio])

  // Auto-scroll to bottom whenever messages change or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sendMessage = async (overrideText = "") => {
    const text = overrideText ? overrideText.trim() : inputValue.trim()
    if (!text || isTyping) return

    // Snapshot current messages BEFORE adding the new user turn,
    // so we can build chat_history from completed exchanges only.
    setMessages(prev => {
      // We need the snapshot inside the updater — capture it via closure below.
      return prev
    })

    // Build chat_history from the CURRENT messages state (completed exchanges).
    // Pair up consecutive user+bot turns, take the last 6 pairs.
    const buildHistory = (msgs) => {
      const pairs = []
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].role === "user" && msgs[i + 1].role === "bot") {
          pairs.push([msgs[i].content, msgs[i + 1].content])
          i++ // skip the bot message we just consumed
        }
      }
      return pairs.slice(-6)
    }

    // Capture the current messages array synchronously before the state update.
    // We read it directly from the ref-free closure; setMessages above is a no-op updater.
    // Instead, use a local variable updated via functional form:
    let chatHistory = []
    setMessages(prev => {
      chatHistory = buildHistory(prev)
      return [...prev, { role: "user", content: text }]
    })

    setInputValue("")
    setIsTyping(true)

    let botMessageAdded = false
    try {
      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, chat_history: chatHistory, portfolio }),
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          content: "",
          confidence: null,
          sources: [],
        },
      ])
      botMessageAdded = true

      let isFirstToken = true
      let shouldBreak = false
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const cleanChunk = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed
          try {
            const eventData = JSON.parse(cleanChunk)
            if (eventData.type === "token") {
              if (isFirstToken) {
                setIsTyping(false)
                isFirstToken = false
              }
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  const lastMsg = { ...next[next.length - 1] }
                  lastMsg.content += eventData.value
                  next[next.length - 1] = lastMsg
                }
                return next
              })
            } else if (eventData.type === "done") {
              let finalAnswer = ""
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  const lastMsg = { ...next[next.length - 1] }
                  lastMsg.confidence = eventData.confidence ?? null
                  lastMsg.sources = Array.isArray(eventData.sources) ? eventData.sources : []
                  lastMsg.farewell = eventData.farewell ?? null
                  next[next.length - 1] = lastMsg
                  finalAnswer = lastMsg.content
                }
                return next
              })

              if (eventData.confidence !== null) {
                fetchFollowups(text, finalAnswer, eventData.source_documents || [])
              }

              if (eventData.farewell) {
                setTimeout(() => {
                  setMessages([])
                }, 3000)
              }
              shouldBreak = true
              break
            } else if (eventData.type === "error") {
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  const lastMsg = { ...next[next.length - 1] }
                  lastMsg.content = "Something went wrong."
                  next[next.length - 1] = lastMsg
                }
                return next
              })
              shouldBreak = true
              break
            }
          } catch (e) {
            console.error("Error parsing JSON:", e)
          }
        }
        if (shouldBreak) break
      }
    } catch (err) {
      console.error("[AIESEC] fetch error:", err)
      if (botMessageAdded) {
        setMessages(prev => {
          const next = [...prev]
          if (next.length > 0) {
            const lastMsg = { ...next[next.length - 1] }
            lastMsg.content = "Something went wrong reaching the server — please try again."
            next[next.length - 1] = lastMsg
          }
          return next
        })
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "bot",
            content: "Something went wrong reaching the server — please try again.",
            confidence: null,
            sources: [],
          },
        ])
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionSelect = (text) => {
    setInputValue(text)
    sendMessage(text)
  }

  const fetchFollowups = (question, answer, sourceDocs) => {
    fetch(`${API_BASE_URL}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        answer,
        source_documents: sourceDocs
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.followups && data.followups.length > 0) {
          setMessages(prev => {
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === "bot") {
                next[i] = { ...next[i], followups: data.followups }
                break
              }
            }
            return next
          })
        }
      })
      .catch(err => {
        console.error("Error fetching follow-up suggestions:", err)
      })
  }

  const handleFollowUpClick = (text) => {
    setInputValue(text)
    sendMessage(text)
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: "#FCFBF4", fontFamily: "'Inter', sans-serif" }}
    >
      {/* 1. Header */}
      <Header portfolio={portfolio} setPortfolio={setPortfolio} />

      {/* 2. Chat area / Empty state */}
      <div className={`flex-1 overflow-y-auto ${isEmpty ? "flex flex-col items-center justify-center h-full w-full" : ""}`}>
        {isEmpty ? (
          (portfolio === "finance_legal" || portfolio === "mxp") ? (
            <SuggestedQuestions portfolio={portfolio} onSelect={handleSuggestionSelect} />
          ) : null
        ) : (
          <div className="px-4 py-6 max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                isLast={i === messages.length - 1}
                onFollowUpClick={handleFollowUpClick}
              />
            ))}

            {/* 4. Typing indicator */}
            {isTyping && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Show scroll anchor even on empty state so the ref exists */}
        {isEmpty && <div ref={messagesEndRef} />}
      </div>

      {/* 5. Input bar */}
      <div
        className="flex-shrink-0 border-t px-4 py-3"
        style={{ background: "#FCFBF4", borderColor: "rgba(20, 5, 134, 0.08)" }}
      >
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything…"
            disabled={isTyping}
            className="flex-1 text-base md:text-sm text-[#0d0d1a] placeholder:text-slate-400 rounded-xl border h-11 px-4 focus-visible:ring-1 focus-visible:ring-[#63B2FB] focus-visible:border-[#63B2FB]"
            style={{
              background: "#ffffff",
              borderColor: "rgba(20, 5, 134, 0.15)",
            }}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="h-11 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-150 cursor-pointer"
            style={{
              background: inputValue.trim() && !isTyping ? "#63B2FB" : "rgba(99, 178, 251, 0.2)",
              color: inputValue.trim() && !isTyping ? "#ffffff" : "rgba(20, 5, 134, 0.4)",
              border: "none",
            }}
          >
            <SendIcon />
            Send
          </Button>
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] mt-2" style={{ color: "rgba(20, 5, 134, 0.5)" }}>
          Press Enter to send · AI responses are for guidance only
        </p>
      </div>

      {/* Custom Themed Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-[#0c0448]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowConfirmModal(false)
            setPendingPortfolio(null)
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-lg text-[#0F0464]">Switch portfolios?</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Your current chat will be cleared.</p>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingPortfolio(null)
                }}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  prevPortfolioRef.current = pendingPortfolio
                  setMessages([])
                  setPortfolio(pendingPortfolio)
                  setShowConfirmModal(false)
                  setPendingPortfolio(null)
                }}
                className="flex-1 h-10 rounded-xl bg-[#63B2FB] hover:bg-[#4ea1eb] text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm shadow-[#63B2FB]/20"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
