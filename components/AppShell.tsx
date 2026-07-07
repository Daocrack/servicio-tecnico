'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { AuthProvider } from '@/context/AuthContext'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const esRutaPublica =
    pathname?.startsWith('/catalogo') ||
    pathname?.startsWith('/dashboard-tecnico') ||
    pathname?.startsWith('/login')

  if (esRutaPublica) {
    return <AuthProvider>{children}</AuthProvider>
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:pl-56 pt-14 lg:pt-0 transition-all duration-300" id="main-content">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
