'use client'

import { useState, useEffect } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type Tecnico = { id: string; nombre_completo: string; telefono: string | null }

type Ticket = {
  id: string
  numero_ticket: number
  estado: string
  prioridad: string
  descripcion_problema: string
  fecha_creacion: string
  fecha_promesa: string | null
  fecha_termino: string | null
  tecnico_asignado_id: string | null
  clientes?: { nombre_completo: string; telefono_1: string | null } | null
  tipos_servicio?: { nombre: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ESTADOS_ACTIVOS = ['Nuevo', 'Asignado', 'En progreso', 'En espera']
const ESTADOS_COMPLETADOS = ['Completado', 'Cerrado', 'Facturado']

const META_MENSUAL = 12 // tickets por mes
const META_DIA = 2      // tickets por día

function getMesActual() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function getHoy() {
  return new Date().toISOString().split('T')[0]
}

function tiempoResolucion(ticket: Ticket): number | null {
  if (!ticket.fecha_termino) return null
  const inicio = new Date(ticket.fecha_creacion).getTime()
  const fin = new Date(ticket.fecha_termino).getTime()
  return Math.round((fin - inicio) / (1000 * 60 * 60)) // horas
}

function formatHoras(h: number): string {
  if (h < 24) return `${h}h`
  const dias = Math.floor(h / 24)
  const horas = h % 24
  return horas > 0 ? `${dias}d ${horas}h` : `${dias}d`
}

function getSemaforoBg(fechaPromesa: string | null, estado: string): string {
  if (!fechaPromesa || !ESTADOS_ACTIVOS.includes(estado)) return ''
  const horas = (new Date(fechaPromesa).getTime() - Date.now()) / (1000 * 60 * 60)
  if (horas < 24) return 'border-l-4 border-l-red-500 bg-red-50'
  if (horas < 48) return 'border-l-4 border-l-orange-500 bg-orange-50'
  if (horas < 120) return 'border-l-4 border-l-yellow-400 bg-yellow-50'
  return 'border-l-4 border-l-green-400 bg-green-50'
}

function getSemaforoLabel(fechaPromesa: string | null, estado: string): string | null {
  if (!fechaPromesa || !ESTADOS_ACTIVOS.includes(estado)) return null
  const horas = (new Date(fechaPromesa).getTime() - Date.now()) / (1000 * 60 * 60)
  if (horas < 0) return '🔴 Vencido'
  if (horas < 24) return `🔴 Vence en ${Math.ceil(horas)}h`
  if (horas < 48) return `🟠 Vence en ${Math.ceil(horas / 24)}d`
  if (horas < 120) return `🟡 Vence en ${Math.ceil(horas / 24)}d`
  return `🟢 Vence en ${Math.ceil(horas / 24)}d`
}

const COLORES_ESTADO: Record<string, string> = {
  'Nuevo': 'bg-blue-100 text-blue-700',
  'Asignado': 'bg-indigo-100 text-indigo-700',
  'En progreso': 'bg-yellow-100 text-yellow-700',
  'En espera': 'bg-orange-100 text-orange-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cerrado': 'bg-gray-100 text-gray-600',
  'Facturado': 'bg-purple-100 text-purple-700',
  'Cancelado': 'bg-red-100 text-red-700',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Componente Barra de progreso ──────────────────────────────────────────
function BarraProgreso({ valor, meta, color }: { valor: number; meta: number; color: string }) {
  const pct = Math.min(100, Math.round((valor / meta) * 100))
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function DashboardTecnicoPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)
  const [pantalla, setPantalla] = useState<'selector' | 'dashboard'>('selector')

  useEffect(() => {
    async function cargar() {
      try {
        const { supabase } = await import('@/lib/supabase')
        const [{ data: tec }, { data: tick }] = await Promise.all([
          supabase.from('tecnicos').select('id, nombre_completo, telefono').order('nombre_completo'),
          supabase.from('tickets').select('*, clientes(nombre_completo, telefono_1), tipos_servicio(nombre)').order('fecha_creacion', { ascending: false }),
        ])
        setTecnicos((tec ?? []) as Tecnico[])
        setTickets((tick ?? []) as Ticket[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  function seleccionarTecnico(t: Tecnico) {
    setTecnicoSeleccionado(t)
    setPantalla('dashboard')
  }

  // ── Métricas del técnico seleccionado ──────────────────────────────────
  const mesActual = getMesActual()
  const hoy = getHoy()

  const misTickets = tickets.filter(t => t.tecnico_asignado_id === tecnicoSeleccionado?.id)
  const misTicketsActivos = misTickets.filter(t => ESTADOS_ACTIVOS.includes(t.estado))
  const misCompletadosMes = misTickets.filter(t =>
    ESTADOS_COMPLETADOS.includes(t.estado) && t.fecha_creacion.startsWith(mesActual)
  )
  const misCompletadosHoy = misTickets.filter(t =>
    ESTADOS_COMPLETADOS.includes(t.estado) && (t.fecha_termino ?? t.fecha_creacion).startsWith(hoy)
  )

  // Tiempo promedio de resolución
  const tiempos = misCompletadosMes.map(t => tiempoResolucion(t)).filter((h): h is number => h !== null)
  const promedioHoras = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null

  // Ranking de todos los técnicos este mes
  const ranking = tecnicos.map(tec => {
    const completados = tickets.filter(t =>
      t.tecnico_asignado_id === tec.id &&
      ESTADOS_COMPLETADOS.includes(t.estado) &&
      t.fecha_creacion.startsWith(mesActual)
    )
    const tiemposT = completados.map(t => tiempoResolucion(t)).filter((h): h is number => h !== null)
    const promT = tiemposT.length > 0 ? Math.round(tiemposT.reduce((a, b) => a + b, 0) / tiemposT.length) : null
    return { ...tec, completados: completados.length, promedio: promT }
  }).sort((a, b) => b.completados - a.completados)

  const miPosicion = ranking.findIndex(r => r.id === tecnicoSeleccionado?.id) + 1

  // Tickets urgentes de hoy
  const urgentesHoy = misTicketsActivos.filter(t => {
    if (!t.fecha_promesa) return false
    const horas = (new Date(t.fecha_promesa).getTime() - Date.now()) / (1000 * 60 * 60)
    return horas < 24
  })

  const ahora = new Date()
  const saludo = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  // ── PANTALLA SELECTOR ───────────────────────────────────────────────────
  if (pantalla === 'selector') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Portal Técnicos</h1>
            <p className="text-blue-300 text-sm mt-1">Servicio Técnico Oxapampa</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <p className="text-white font-semibold">¿Quién eres?</p>
              <p className="text-blue-200 text-xs mt-0.5">Selecciona tu nombre para ver tu dashboard</p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-sm mt-3">Cargando...</p>
              </div>
            ) : tecnicos.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No hay técnicos registrados</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tecnicos.map(t => {
                  const completadosMes = tickets.filter(tk =>
                    tk.tecnico_asignado_id === t.id &&
                    ESTADOS_COMPLETADOS.includes(tk.estado) &&
                    tk.fecha_creacion.startsWith(getMesActual())
                  ).length
                  const activos = tickets.filter(tk =>
                    tk.tecnico_asignado_id === t.id && ESTADOS_ACTIVOS.includes(tk.estado)
                  ).length
                  return (
                    <button
                      key={t.id}
                      onClick={() => seleccionarTecnico(t)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {t.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{t.nombre_completo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {activos} activo{activos !== 1 ? 's' : ''} · {completadosMes} completado{completadosMes !== 1 ? 's' : ''} este mes
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <a href="/dashboard" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                ← Ir al panel de administración
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── PANTALLA DASHBOARD DEL TÉCNICO ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs">{saludo},</p>
            <h1 className="text-xl font-bold text-white">{tecnicoSeleccionado?.nombre_completo}</h1>
            <p className="text-blue-300 text-xs mt-0.5">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => { setPantalla('selector'); setTecnicoSeleccionado(null) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cambiar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Alerta urgentes */}
        {urgentesHoy.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl animate-bounce">🚨</span>
            <div>
              <p className="text-sm font-bold text-red-800">
                {urgentesHoy.length} ticket{urgentesHoy.length > 1 ? 's' : ''} por vencer hoy
              </p>
              <p className="text-xs text-red-600">Requieren atención inmediata</p>
            </div>
          </div>
        )}

        {/* KPIs del día */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📅 Hoy</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Completados hoy</p>
              <p className="text-3xl font-bold text-blue-600">{misCompletadosHoy.length}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Meta del día</span>
                  <span>{misCompletadosHoy.length}/{META_DIA}</span>
                </div>
                <BarraProgreso valor={misCompletadosHoy.length} meta={META_DIA} color="bg-blue-500" />
              </div>
              {misCompletadosHoy.length >= META_DIA && (
                <p className="text-xs text-green-600 font-semibold mt-2">🎯 ¡Meta del día cumplida!</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Tickets activos</p>
              <p className="text-3xl font-bold text-orange-500">{misTicketsActivos.length}</p>
              <p className="text-xs text-gray-400 mt-2">en cola ahora</p>
              {misTicketsActivos.filter(t => t.prioridad === 'Urgente').length > 0 && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  🔴 {misTicketsActivos.filter(t => t.prioridad === 'Urgente').length} urgente{misTicketsActivos.filter(t => t.prioridad === 'Urgente').length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Meta mensual */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📊 Meta mensual</p>
            <span className="text-xs font-bold text-blue-600">{misCompletadosMes.length} / {META_MENSUAL}</span>
          </div>
          <BarraProgreso valor={misCompletadosMes.length} meta={META_MENSUAL} color={
            misCompletadosMes.length >= META_MENSUAL ? 'bg-green-500' :
            misCompletadosMes.length >= META_MENSUAL * 0.7 ? 'bg-blue-500' :
            misCompletadosMes.length >= META_MENSUAL * 0.4 ? 'bg-yellow-500' : 'bg-red-400'
          } />
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>0</span>
            <span className="font-medium">
              {misCompletadosMes.length >= META_MENSUAL ? '🏆 ¡Meta cumplida!' :
               `Faltan ${META_MENSUAL - misCompletadosMes.length} ticket${META_MENSUAL - misCompletadosMes.length !== 1 ? 's' : ''}`}
            </span>
            <span>{META_MENSUAL}</span>
          </div>

          {/* Tiempo promedio */}
          {promedioHoras !== null && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">⏱ Tiempo promedio de resolución</p>
                <p className="text-lg font-bold text-gray-700">{formatHoras(promedioHoras)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Posición en el equipo</p>
                <p className="text-2xl font-bold text-blue-600">#{miPosicion}</p>
              </div>
            </div>
          )}
        </div>

        {/* Mis tickets activos */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">🎫 Mis tickets activos</p>
          {misTicketsActivos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-10 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-500 font-medium text-sm">Sin tickets pendientes</p>
              <p className="text-gray-300 text-xs mt-1">¡Todo al día!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {misTicketsActivos
                .sort((a, b) => {
                  // Urgentes primero, luego por fecha promesa
                  if (a.prioridad === 'Urgente' && b.prioridad !== 'Urgente') return -1
                  if (b.prioridad === 'Urgente' && a.prioridad !== 'Urgente') return 1
                  if (a.fecha_promesa && b.fecha_promesa) return new Date(a.fecha_promesa).getTime() - new Date(b.fecha_promesa).getTime()
                  if (a.fecha_promesa) return -1
                  if (b.fecha_promesa) return 1
                  return 0
                })
                .map(ticket => {
                  const semBg = getSemaforoBg(ticket.fecha_promesa, ticket.estado)
                  const semLabel = getSemaforoLabel(ticket.fecha_promesa, ticket.estado)
                  return (
                    <a
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className={`block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${semBg}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">#{ticket.numero_ticket}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORES_ESTADO[ticket.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ticket.estado}
                          </span>
                          {ticket.prioridad === 'Urgente' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">🚨 Urgente</span>
                          )}
                        </div>
                        {semLabel && <span className="text-xs font-medium flex-shrink-0">{semLabel}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{ticket.clientes?.nombre_completo ?? 'Cliente'}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{ticket.descripcion_problema}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{ticket.tipos_servicio?.nombre ?? '—'}</span>
                        <span>·</span>
                        <span>Creado: {formatFecha(ticket.fecha_creacion)}</span>
                      </div>
                    </a>
                  )
                })}
            </div>
          )}
        </div>

        {/* Ranking del equipo */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
            <p className="text-white font-semibold text-sm">🏆 Ranking del equipo — {new Date().toLocaleString('es-PE', { month: 'long' })}</p>
            <p className="text-blue-200 text-xs mt-0.5">Tickets completados este mes</p>
          </div>
          <div className="divide-y divide-gray-100">
            {ranking.map((tec, i) => {
              const esMi = tec.id === tecnicoSeleccionado?.id
              const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
              return (
                <div
                  key={tec.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${esMi ? 'bg-blue-50' : ''}`}
                >
                  <span className="text-lg w-8 text-center flex-shrink-0">{medalla}</span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${esMi ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {tec.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${esMi ? 'text-blue-700' : 'text-gray-900'}`}>
                      {tec.nombre_completo} {esMi && <span className="text-xs font-normal text-blue-400">(tú)</span>}
                    </p>
                    {tec.promedio !== null && (
                      <p className="text-xs text-gray-400">Promedio: {formatHoras(tec.promedio)}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-bold ${esMi ? 'text-blue-600' : 'text-gray-700'}`}>{tec.completados}</p>
                    <p className="text-xs text-gray-400">ticket{tec.completados !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {ranking.every(r => r.completados === 0) && (
            <div className="px-5 py-4 text-center text-xs text-gray-400">Sin tickets completados este mes aún — ¡el primero que cierre uno lidera!</div>
          )}
        </div>

        {/* Acceso rápido admin */}
        <div className="text-center pb-4">
          <a href="/dashboard" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
            ← Ir al panel de administración
          </a>
        </div>

      </div>
    </div>
  )
}
