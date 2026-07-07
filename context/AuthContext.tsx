'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// ── Tipos ──────────────────────────────────────────────────────────────────
export type RolUsuario = 'administrador' | 'tecnico' | 'vendedor' | 'cliente'

export type UsuarioSesion = {
  id: string
  nombre_completo: string
  email: string
  rol: RolUsuario
  tecnico_id?: string // solo si es técnico
  cliente_id?: string // solo si es cliente
}

type AuthContextType = {
  usuario: UsuarioSesion | null
  loading: boolean
  login: (email: string, pin: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  esAdmin: boolean
  esVendedor: boolean
  esTecnico: boolean
  esCliente: boolean
}

// ── Rutas por rol ──────────────────────────────────────────────────────────
export const RUTA_POR_ROL: Record<RolUsuario, string> = {
  administrador: '/dashboard',
  vendedor: '/ventas',
  tecnico: '/mis-tickets',
  cliente: '/mis-tickets-cliente',
}

// Rutas permitidas por rol
export const RUTAS_PERMITIDAS: Record<RolUsuario, string[]> = {
  administrador: ['/'], // acceso total
  vendedor: ['/ventas', '/inventario', '/clientes', '/catalogo'],
  tecnico: ['/mis-tickets', '/tickets'],
  cliente: ['/mis-tickets-cliente'],
}

const SESION_KEY = 'sto_sesion'
const SESION_EXPIRY_DAYS = 7

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Rutas públicas que no requieren login
  const RUTAS_PUBLICAS = ['/login', '/catalogo', '/dashboard-tecnico']
  const esRutaPublica = RUTAS_PUBLICAS.some(r => pathname?.startsWith(r))

  // Cargar sesión guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESION_KEY)
      if (raw) {
        const { usuario: u, expiry } = JSON.parse(raw)
        if (Date.now() < expiry) {
          setUsuario(u)
        } else {
          localStorage.removeItem(SESION_KEY)
        }
      }
    } catch {
      localStorage.removeItem(SESION_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  // Guard de rutas
  useEffect(() => {
    if (loading) return
    if (esRutaPublica) return

    if (!usuario) {
      router.replace('/login')
      return
    }

    // Verificar acceso a la ruta actual
    if (usuario.rol !== 'administrador') {
      const permitidas = RUTAS_PERMITIDAS[usuario.rol]
      const tieneAcceso = permitidas.some(r => pathname?.startsWith(r))
      if (!tieneAcceso) {
        router.replace(RUTA_POR_ROL[usuario.rol])
      }
    }
  }, [usuario, loading, pathname, esRutaPublica])

  async function login(email: string, pin: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { supabase } = await import('@/lib/supabase')

      // Buscar en personal primero
      const { data: personal } = await supabase
        .from('personal')
        .select('id, nombre_completo, email, rol, pin_hash, activo')
        .eq('email', email.toLowerCase().trim())
        .eq('activo', true)
        .single()

      if (personal) {
        if (personal.pin_hash !== pin) {
          return { ok: false, error: 'PIN incorrecto' }
        }

        const u: UsuarioSesion = {
          id: personal.id,
          nombre_completo: personal.nombre_completo,
          email: personal.email,
          rol: personal.rol as RolUsuario,
          ...(personal.rol === 'tecnico' ? { tecnico_id: personal.id } : {}),
        }

        guardarSesion(u)

        // Actualizar último acceso
        await supabase.from('personal').update({ ultimo_acceso: new Date().toISOString() }).eq('id', personal.id)

        router.replace(RUTA_POR_ROL[u.rol])
        return { ok: true }
      }

      // Buscar en clientes_acceso
      const { data: clienteAcceso } = await supabase
        .from('clientes_acceso')
        .select('id, cliente_id, email, pin_hash, activo, clientes(nombre_completo)')
        .eq('email', email.toLowerCase().trim())
        .eq('activo', true)
        .single()

      if (clienteAcceso) {
        if (clienteAcceso.pin_hash !== pin) {
          return { ok: false, error: 'PIN incorrecto' }
        }

        const u: UsuarioSesion = {
          id: clienteAcceso.id,
          nombre_completo: (clienteAcceso.clientes as { nombre_completo: string })?.nombre_completo ?? 'Cliente',
          email: clienteAcceso.email,
          rol: 'cliente',
          cliente_id: clienteAcceso.cliente_id,
        }

        guardarSesion(u)
        await supabase.from('clientes_acceso').update({ ultimo_acceso: new Date().toISOString() }).eq('id', clienteAcceso.id)
        router.replace(RUTA_POR_ROL['cliente'])
        return { ok: true }
      }

      return { ok: false, error: 'Email no encontrado en el sistema' }
    } catch (e) {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' }
    }
  }

  function guardarSesion(u: UsuarioSesion) {
    const expiry = Date.now() + SESION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(SESION_KEY, JSON.stringify({ usuario: u, expiry }))
    setUsuario(u)
  }

  function logout() {
    localStorage.removeItem(SESION_KEY)
    setUsuario(null)
    router.replace('/login')
  }

  return (
    <AuthContext.Provider value={{
      usuario, loading,
      login, logout,
      esAdmin: usuario?.rol === 'administrador',
      esVendedor: usuario?.rol === 'vendedor',
      esTecnico: usuario?.rol === 'tecnico',
      esCliente: usuario?.rol === 'cliente',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
