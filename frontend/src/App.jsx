import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "@/components/AppLayout"
import LandingPage from "@/pages/LandingPage"
import AboutPage from "@/pages/AboutPage"
import ChatPage from "@/pages/ChatPage"
import DocumentsPage from "@/pages/DocumentsPage"
import AdminPage from "@/pages/AdminPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route element={<AppLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
