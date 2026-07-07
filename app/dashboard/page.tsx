'use client'

import { useState, useEffect } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type EstadoTicket = 'Nuevo' | 'Asignado' | 'En progreso' | 'En espera' | 'Completado' | 'Cerrado' | 'Facturado' | 'Cancelado'

type Ticket = {
  id: string
  numero_ticket: number
  estado: EstadoTicket
  prioridad: string
  descripcion_problema: string
  fecha_creacion: string
  fecha_promesa: string | null
  clientes?: { nombre_completo: string }
  tecnicos?: { nombre_completo: string } | null
  tipos_servicio?: { nombre: string; precio_base?: number } | null
}

type ItemInventario = {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  precio_costo: number | null
  categoria: string
}

type Cliente = {
  id: string
  nombre_completo: string
  created_at: string
}

type DashboardData = {
  tickets: Ticket[]
  inventario: ItemInventario[]
  clientes: Cliente[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getNombreMes(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', { month: 'short' })
}

function getMesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMesAnterior() {
  const now = new Date()
  now.setMonth(now.getMonth() - 1)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function esMesActual(fecha: string) {
  return fecha.startsWith(getMesActual())
}

function esMesAnterior(fecha: string) {
  return fecha.startsWith(getMesAnterior())
}

function getDiasRestantes(fecha: string) {
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const COLORES_ESTADO: Record<EstadoTicket, string> = {
  'Nuevo': 'bg-blue-100 text-blue-700',
  'Asignado': 'bg-indigo-100 text-indigo-700',
  'En progreso': 'bg-yellow-100 text-yellow-700',
  'En espera': 'bg-orange-100 text-orange-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cerrado': 'bg-gray-100 text-gray-600',
  'Facturado': 'bg-purple-100 text-purple-700',
  'Cancelado': 'bg-red-100 text-red-700',
}

const ESTADOS_ACTIVOS: EstadoTicket[] = ['Nuevo', 'Asignado', 'En progreso', 'En espera']

// ── Componente principal ───────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date())

  async function cargarDatos() {
    try {
      setLoading(true)
      setError(null)
      const [
        { obtenerTickets },
        { obtenerInventario },
        { obtenerClientes },
      ] = await Promise.all([
        import('@/lib/db'),
        import('@/lib/db'),
        import('@/lib/db'),
      ])
      const [tickets, inventario, clientes] = await Promise.all([
        obtenerTickets(),
        obtenerInventario(),
        obtenerClientes(),
      ])
      setData({ tickets, inventario, clientes })
      setUltimaActualizacion(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // ── Métricas calculadas ──────────────────────────────────────────────────
  const tickets = data?.tickets ?? []
  const inventario = data?.inventario ?? []
  const clientes = data?.clientes ?? []

  const ticketsActivos = tickets.filter(t => ESTADOS_ACTIVOS.includes(t.estado))
  const ticketsUrgentes = ticketsActivos.filter(t => t.prioridad === 'Urgente')
  const ticketsMesActual = tickets.filter(t => esMesActual(t.fecha_creacion))
  const ticketsMesAnterior = tickets.filter(t => esMesAnterior(t.fecha_creacion))

  const clientesMesActual = clientes.filter(c => esMesActual(c.created_at))

  const stockBajo = inventario.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo)
  const sinStock = inventario.filter(i => i.stock_actual === 0)

  const valorInventario = inventario.reduce((acc, i) =>
    acc + (i.stock_actual * (i.precio_costo ?? 0)), 0)

  // Tickets por estado para el gráfico de barras
  const porEstado = ESTADOS_ACTIVOS.map(estado => ({
    estado,
    count: tickets.filter(t => t.estado === estado).length,
  }))
  const maxEstado = Math.max(...porEstado.map(e => e.count), 1)

  // Tickets por prioridad
  const porPrioridad = ['Urgente', 'Alta', 'Normal', 'Bajo'].map(p => ({
    prioridad: p,
    count: ticketsActivos.filter(t => t.prioridad === p).length,
  }))

  // Actividad últimos 7 días
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return {
      dia: d.toLocaleDateString('es-PE', { weekday: 'short' }),
      fecha: key,
      count: tickets.filter(t => t.fecha_creacion.startsWith(key)).length,
    }
  })
  const maxDia = Math.max(...ultimos7Dias.map(d => d.count), 1)

  // Tickets próximos a vencer (con fecha promesa en los próximos 3 días)
  const proximosVencer = ticketsActivos
    .filter(t => t.fecha_promesa)
    .map(t => ({ ...t, diasRestantes: getDiasRestantes(t.fecha_promesa!) }))
    .filter(t => t.diasRestantes <= 3)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 5)

  // Tickets recientes
  const ticketsRecientes = [...tickets]
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    .slice(0, 6)

  const ahora = new Date()
  const saludo = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = ahora.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error al cargar</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={cargarDatos} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/" className="hover:text-blue-600">Inicio</a>
              <span>›</span>
              <span className="text-gray-700 font-medium">Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{saludo} 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{fechaStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Actualizado: {ultimaActualizacion.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={cargarDatos}
              className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Alertas urgentes */}
        {(ticketsUrgentes.length > 0 || sinStock.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ticketsUrgentes.length > 0 && (
              <a href="/tickets" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🚨</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800">
                    {ticketsUrgentes.length} ticket{ticketsUrgentes.length > 1 ? 's' : ''} urgente{ticketsUrgentes.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-600">Requieren atención inmediata</p>
                </div>
                <svg className="w-4 h-4 text-red-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
            {sinStock.length > 0 && (
              <a href="/inventario" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    {sinStock.length} producto{sinStock.length > 1 ? 's' : ''} sin stock
                  </p>
                  <p className="text-xs text-amber-600">Revisar inventario</p>
                </div>
                <svg className="w-4 h-4 text-amber-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* KPIs principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Tickets activos"
            value={ticketsActivos.length}
            sub={`${ticketsMesActual.length} este mes`}
            trend={ticketsMesActual.length - ticketsMesAnterior.length}
            trendLabel="vs mes anterior"
            icon="🎫"
            href="/tickets"
            color="blue"
          />
          <KpiCard
            label="Clientes"
            value={clientes.length}
            sub={`+${clientesMesActual.length} este mes`}
            icon="👥"
            href="/clientes"
            color="green"
          />
          <KpiCard
            label="Productos en stock"
            value={inventario.filter(i => i.stock_actual > 0).length}
            sub={stockBajo.length > 0 ? `${stockBajo.length} con stock bajo` : 'Todo en orden'}
            icon="📦"
            href="/inventario"
            color={stockBajo.length > 0 ? "amber" : "green"}
            alert={stockBajo.length > 0}
          />
          <KpiCard
            label="Valor inventario"
            value={`S/ ${valorInventario.toFixed(0)}`}
            sub={`${inventario.length} productos`}
            icon="💰"
            href="/inventario"
            color="purple"
          />
        </div>

        {/* Fila: gráfico tickets por estado + actividad semanal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Tickets por estado */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Estado actual de tickets</h2>
              <a href="/tickets" className="text-xs text-blue-600 hover:underline">Ver todos →</a>
            </div>
            {tickets.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Sin tickets aún</div>
            ) : (
              <div className="space-y-3">
                {porEstado.map(({ estado, count }) => (
                  <div key={estado} className="flex items-center gap-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-24 justify-center ${COLORES_ESTADO[estado]}`}>
                      {estado}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(count / maxEstado) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Prioridades */}
            {ticketsActivos.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Por prioridad (activos)</p>
                <div className="grid grid-cols-4 gap-2">
                  {porPrioridad.map(({ prioridad, count }) => (
                    <div key={prioridad} className={`rounded-lg p-2.5 text-center ${
                      prioridad === 'Urgente' ? 'bg-red-50' :
                      prioridad === 'Alta' ? 'bg-orange-50' :
                      prioridad === 'Normal' ? 'bg-blue-50' : 'bg-gray-50'
                    }`}>
                      <div className={`text-xl font-bold ${
                        prioridad === 'Urgente' ? 'text-red-600' :
                        prioridad === 'Alta' ? 'text-orange-600' :
                        prioridad === 'Normal' ? 'text-blue-600' : 'text-gray-500'
                      }`}>{count}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{prioridad}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actividad últimos 7 días */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Tickets creados — últimos 7 días</h2>
            </div>
            <div className="flex items-end gap-2 h-32">
              {ultimos7Dias.map((dia, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    {dia.count > 0 ? dia.count : ''}
                  </span>
                  <div className="w-full flex items-end" style={{ height: 80 }}>
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        dia.fecha === new Date().toISOString().split('T')[0]
                          ? 'bg-blue-500'
                          : dia.count > 0 ? 'bg-blue-200' : 'bg-gray-100'
                      }`}
                      style={{ height: `${Math.max((dia.count / maxDia) * 80, dia.count > 0 ? 8 : 4)}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{dia.dia}</span>
                </div>
              ))}
            </div>

            {/* Resumen semana */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {ultimos7Dias.reduce((a, d) => a + d.count, 0)}
                </div>
                <div className="text-xs text-gray-400">Esta semana</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{ticketsMesActual.length}</div>
                <div className="text-xs text-gray-400">Este mes</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{tickets.length}</div>
                <div className="text-xs text-gray-400">Total histórico</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fila: próximos a vencer + tickets recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Próximos a vencer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">⏰ Próximos a vencer</h2>
              <span className="text-xs text-gray-400">Con fecha promesa ≤ 3 días</span>
            </div>
            {proximosVencer.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm text-gray-500">Sin vencimientos próximos</p>
                <p className="text-xs text-gray-400 mt-0.5">Todos los tickets están a tiempo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proximosVencer.map(ticket => (
                  <a
                    key={ticket.id}
                    href="/tickets"
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                      ticket.diasRestantes < 0 ? 'border-red-200 bg-red-50' :
                      ticket.diasRestantes === 0 ? 'border-orange-200 bg-orange-50' :
                      'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      ticket.diasRestantes < 0 ? 'bg-red-100 text-red-700' :
                      ticket.diasRestantes === 0 ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {ticket.diasRestantes < 0 ? `${Math.abs(ticket.diasRestantes)}d` :
                       ticket.diasRestantes === 0 ? 'Hoy' : `${ticket.diasRestantes}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        #{ticket.numero_ticket} — {ticket.clientes?.nombre_completo ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{ticket.descripcion_problema}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${COLORES_ESTADO[ticket.estado]}`}>
                      {ticket.estado}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Tickets recientes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">🕐 Actividad reciente</h2>
              <a href="/tickets" className="text-xs text-blue-600 hover:underline">Ver todos →</a>
            </div>
            {ticketsRecientes.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">🎫</div>
                <p className="text-sm text-gray-500">No hay tickets aún</p>
                <a href="/tickets" className="text-xs text-blue-600 hover:underline mt-1 block">Crear primer ticket →</a>
              </div>
            ) : (
              <div className="space-y-2">
                {ticketsRecientes.map(ticket => {
                  const hace = tiempoRelativo(ticket.fecha_creacion)
                  return (
                    <a
                      key={ticket.id}
                      href="/tickets"
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                        #{ticket.numero_ticket}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ticket.clientes?.nombre_completo ?? 'Cliente'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{ticket.descripcion_problema}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COLORES_ESTADO[ticket.estado]}`}>
                          {ticket.estado}
                        </span>
                        <span className="text-xs text-gray-400">{hace}</span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Inventario bajo stock */}
        {(stockBajo.length > 0 || sinStock.length > 0) && (
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">📦 Productos que necesitan reabastecimiento</h2>
              <a href="/inventario" className="text-xs text-blue-600 hover:underline">Ver inventario →</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...sinStock, ...stockBajo].slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.stock_actual === 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    item.stock_actual === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {item.stock_actual}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500">Mínimo: {item.stock_minimo}</p>
                  </div>
                  <span className={`text-xs font-medium ${item.stock_actual === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {item.stock_actual === 0 ? 'Agotado' : 'Bajo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a href="/tickets" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors group">
              <span className="text-2xl">🎫</span>
              <span className="text-sm font-medium text-blue-700">Tickets</span>
            </a>
            <a href="/clientes" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-colors group">
              <span className="text-2xl">👥</span>
              <span className="text-sm font-medium text-green-700">Clientes</span>
            </a>
            <a href="/inventario" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors group">
              <span className="text-2xl">📦</span>
              <span className="text-sm font-medium text-purple-700">Inventario</span>
            </a>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100 opacity-50 cursor-not-allowed">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-gray-500">Reportes</span>
              <span className="text-xs text-gray-400">Próximamente</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helpers de tiempo ──────────────────────────────────────────────────────
function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  const horas = Math.floor(mins / 60)
  const dias = Math.floor(horas / 24)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  if (horas < 24) return `hace ${horas}h`
  if (dias < 7) return `hace ${dias}d`
  return new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

// ── KpiCard ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, trend, trendLabel, icon, href, color, alert
}: {
  label: string
  value: string | number
  sub?: string
  trend?: number
  trendLabel?: string
  icon: string
  href?: string
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  alert?: boolean
}) {
  const bg = {
    blue: 'bg-blue-50 border-blue-100 hover:bg-blue-100',
    green: 'bg-green-50 border-green-100 hover:bg-green-100',
    amber: alert ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100',
    purple: 'bg-purple-50 border-purple-100 hover:bg-purple-100',
    red: 'bg-red-50 border-red-100 hover:bg-red-100',
  }
  const textColor = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    amber: alert ? 'text-amber-700' : 'text-gray-700',
    purple: 'text-purple-700',
    red: 'text-red-700',
  }

  const content = (
    <div className={`rounded-xl border p-4 transition-colors ${bg[color]} ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textColor[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      {trend !== undefined && trendLabel && (
        <div className={`text-xs mt-1.5 font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→ igual'} {trendLabel}
        </div>
      )}
    </div>
  )

  return href ? <a href={href}>{content}</a> : content
}
