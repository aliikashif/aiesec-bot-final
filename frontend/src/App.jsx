import { BrowserRouter, Routes, Route } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import ChatPage from "@/pages/ChatPage"
import DocumentsPage from "@/pages/DocumentsPage"
import AdminPage from "@/pages/AdminPage"

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-row h-screen w-screen bg-[#0d0d1a] overflow-hidden text-white font-sans">
        {/* Left: Collapsible Sidebar */}
        <Sidebar />

        {/* Right: Main content area taking remaining width, scrollable */}
        <main className="flex-1 h-full overflow-hidden">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
