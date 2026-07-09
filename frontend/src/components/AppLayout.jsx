import { Outlet } from "react-router-dom"
import Sidebar from "@/components/Sidebar"

export default function AppLayout() {
  return (
    <div className="flex flex-row h-screen w-screen bg-[#FCFBF4] overflow-hidden text-[#0d0d1a] font-sans">
      {/* Left: Collapsible Sidebar */}
      <Sidebar />

      {/* Right: Main content area taking remaining width, scrollable */}
      <main className="flex-1 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
