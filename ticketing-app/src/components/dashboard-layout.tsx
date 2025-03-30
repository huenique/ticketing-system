import { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"

interface DashboardLayoutProps {
  children: ReactNode
}

function  DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}

export { DashboardLayout } 