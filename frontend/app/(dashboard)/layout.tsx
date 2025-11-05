"use client"

import { ProtectedRoute } from "@/components/shared/ProtectedRoute"
import { Sidebar } from "@/components/shared/Sidebar"
import { Header } from "@/components/shared/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
