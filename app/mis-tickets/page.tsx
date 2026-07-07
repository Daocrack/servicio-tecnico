'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

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
  tipos_servicio?: { nombre: string; precio_base: number | null } | null
}

type Tecnico = { id: string; nombre_completo: string }

const ESTADOS_ACTIVOS = ['Nuevo', 'Asignado', 'En progreso', 'En espera']
const ESTADOS_COMPLETADOS = ['Completado', 'Cerrado', 'Facturado']

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

const COLORES_PRIORIDAD: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700',
  'Alta': 'bg-orange-100 text-orange-700',
  'Normal': 'bg-gray-100 text-gray-600',
  'Bajo': 'bg-gray-50 text-gray-400',
}

function getSemaforo(fechaPromesa: string | null, estado: string) {
  if (!fechaPromesa || !ESTADOS_ACTIVOS.includes(estado)) return null
  const horas = (new Date(fechaPromesa).getTime() - Date.now()) / (1000 * 60 * 60)
  if (horas < 0) return { texto: 'Vencido', bg: 'bg-red-50 border-l-4 border-l-red-500', badge: 'bg-red-100 text-red-700' }
  if (horas < 24) return { texto: `${Math.ceil(horas)}h`, bg: 'bg-red-50 border-l-4 border-l-red-400', badge: 'bg-red-100 text-red-700' }
  if (horas < 48) return { texto: `${Math.ceil(horas / 24)}d`, bg: 'bg-orange-50 border-l-4 border-l-orange-400', badge: 'bg-orange-100 text-orange-700' }
  if (horas < 120) return { texto: `${Math.ceil(horas / 24)}d`, bg: 'bg-yellow-50 border-l-4 border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-700' }
  return { texto: `${Math.ceil(horas / 24)}d`, bg: 'bg-green-50 border-l-4 border-l-green-400', badge: 'bg-green-100 text-green-700' }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getMesActual() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export default function MisTicketsPage() {
  const { usuario } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'completados' | 'todos'>('activos')

  useEffect(() => {
    if (!usuario) return
    cargarDatos()
  }, [usuario])

  async function cargarDatos() {
    try {
      setLoading(true); setError(null)
      const { supabase } = await import('@/lib/supabase')

      // Buscar el técnico por el id del personal
      const { data: tec } = await supabase
        .from('tecnicos')
        .select('id, nombre_completo')
        .eq('email', usuario?.email)
        .single()

      // Si no hay match por email, buscar por nombre
      let tecnicoId = tec?.id
      if (!tecnicoId) {
        const { data: tecPorNombre } = await supabase
          .from('tecnicos')
          .select('id, nombre_completo')
          .eq('nombre_completo', usuario?.nombre_completo)
          .single()
        tecnicoId = tecPorNombre?.id
        if (tecPorNombre) setTecnico(tecPorNombre)
      } else {
        setTecnico(tec)
      }

      if (!tecnicoId) {
        setError('No se encontró tu perfil de técnico. Contacta al administrador.')
        return
      }

      const { data: tick, error: errTick } = await supabase
        .from('tickets')
        .select('*, clientes(nombre_completo, telefono_1), tipos_servicio(nombre, precio_base)')
        .eq('tecnico_asignado_id', tecnicoId)
        .order('fecha_creacion', { ascending: false })

      if (errTick) throw errTick
      setTickets((tick ?? []) as Ticket[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar tickets')
    } finally {
      setLoading(false)
    }
  }

  const ticketsFiltrados = tickets.filter(t => {
    if (filtroEstado === 'activos') return ESTADOS_ACTIVOS.includes(t.estado)
    if (filtroEstado === 'completados') return ESTADOS_COMPLETADOS.includes(t.estado)
    return true
  })

  const activos = tickets.filter(t => ESTADOS_ACTIVOS.includes(t.estado))
  const completadosMes = tickets.filter(t =>
    ESTADOS_COMPLETADOS.includes(t.estado) && t.fecha_creacion.startsWith(getMesActual())
  )
  const urgentes = activos.filter(t => t.prioridad === 'Urgente')

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Cargando tus tickets...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Mis Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tecnico?.nombre_completo ?? usuario?.nombre_completo}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Alerta urgentes */}
        {urgentes.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-sm font-bold text-red-800">
                {urgentes.length} ticket{urgentes.length > 1 ? 's' : ''} urgente{urgentes.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600">Requieren atención inmediata</p>
            </div>
          </div>
        )}

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{activos.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Activos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completadosMes.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Completados este mes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{tickets.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total histórico</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['activos', 'completados', 'todos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors capitalize ${
                filtroEstado === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'activos' ? `Activos (${activos.length})` :
               f === 'completados' ? `Completados` : 'Todos'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Lista de tickets */}
        {!error && (
          ticketsFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-gray-500 font-medium">
                {filtroEstado === 'activos' ? 'Sin tickets activos' : 'Sin tickets en esta categoría'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {filtroEstado === 'activos' ? '¡Todo al día!' : 'Prueba con otro filtro'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ticketsFiltrados
                .sort((a, b) => {
                  if (a.prioridad === 'Urgente' && b.prioridad !== 'Urgente') return -1
                  if (b.prioridad === 'Urgente' && a.prioridad !== 'Urgente') return 1
                  if (a.fecha_promesa && b.fecha_promesa) {
                    return new Date(a.fecha_promesa).getTime() - new Date(b.fecha_promesa).getTime()
                  }
                  if (a.fecha_promesa) return -1
                  if (b.fecha_promesa) return 1
                  return 0
                })
                .map(ticket => {
                  const sem = getSemaforo(ticket.fecha_promesa, ticket.estado)
                  return (
                    <a
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className={`block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${sem?.bg ?? ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-400">#{ticket.numero_ticket}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORES_ESTADO[ticket.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ticket.estado}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORES_PRIORIDAD[ticket.prioridad] ?? ''}`}>
                            {ticket.prioridad}
                          </span>
                        </div>
                        {sem && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sem.badge}`}>
                            ⏱ {sem.texto}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-gray-900 mb-0.5">
                        {ticket.clientes?.nombre_completo ?? 'Cliente'}
                      </p>
                      {ticket.clientes?.telefono_1 && (
                        <p className="text-xs text-blue-600 mb-1">📞 {ticket.clientes.telefono_1}</p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{ticket.descripcion_problema}</p>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span>{ticket.tipos_servicio?.nombre ?? '—'}</span>
                        <div className="flex items-center gap-3">
                          <span>Creado: {formatFecha(ticket.fecha_creacion)}</span>
                          {ticket.fecha_promesa && (
                            <span className="text-orange-500">Entrega: {formatFecha(ticket.fecha_promesa)}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
