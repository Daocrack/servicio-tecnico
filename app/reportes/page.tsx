'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ── Tipos ──────────────────────────────────────────────────────────────────
type Venta = {
  id: string
  total: number
  subtotal: number
  descuento: number
  metodo_pago: string
  items: { nombre_producto: string; cantidad: number; subtotal: number }[]
  vendedor_nombre: string | null
  created_at: string
  clientes?: { nombre_completo: string } | null
}

type Ticket = {
  id: string
  numero_ticket: number
  estado: string
  prioridad: string
  fecha_creacion: string
  tecnicos?: { nombre_completo: string } | null
  tipos_servicio?: { nombre: string; precio_base?: number } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function getMesKey(fecha: string) {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMesLabel(key: string) {
  const [, m] = key.split('-')
  return MESES[parseInt(m) - 1]
}

function formatCurrency(v: number) { return `S/ ${v.toFixed(2)}` }
function formatCurrencyShort(v: number) {
  if (v >= 1000) return `S/ ${(v / 1000).toFixed(1)}k`
  return `S/ ${v.toFixed(0)}`
}

const COLORES = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

const COLORES_ESTADO: Record<string, string> = {
  'Nuevo': '#3b82f6', 'Asignado': '#6366f1', 'En progreso': '#f59e0b',
  'En espera': '#f97316', 'Completado': '#10b981', 'Cerrado': '#6b7280',
  'Facturado': '#8b5cf6', 'Cancelado': '#ef4444',
}

// ── Tooltip personalizado ──────────────────────────────────────────────────
const TooltipVentas = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.name === 'Ingresos' ? '#3b82f6' : '#10b981' }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

const TooltipTickets = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ReportesPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<6 | 12>(6)

  async function cargarDatos() {
    try {
      setLoading(true); setError(null)
      const { obtenerVentas, obtenerTickets } = await import('@/lib/db')
      const [v, t] = await Promise.all([obtenerVentas(), obtenerTickets()])
      setVentas(v as Venta[])
      setTickets(t as Ticket[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // ── Procesar datos para gráficos ──────────────────────────────────────────

  // Últimos N meses
  const ultimosMeses = Array.from({ length: periodo }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (periodo - 1 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // 1. Ventas e ingresos por mes (barras + línea)
  const dataVentasMes = ultimosMeses.map(mes => {
    const ventasMes = ventas.filter(v => getMesKey(v.created_at) === mes)
    return {
      mes: getMesLabel(mes),
      'Ingresos': ventasMes.reduce((a, v) => a + v.total, 0),
      'N° Ventas': ventasMes.length,
    }
  })

  // 2. Tickets por mes (barras apiladas por estado)
  const dataTicketsMes = ultimosMeses.map(mes => {
    const ticketsMes = tickets.filter(t => getMesKey(t.fecha_creacion) === mes)
    const result: Record<string, string | number> = { mes: getMesLabel(mes) }
    ;['Nuevo','Asignado','En progreso','Completado','Cancelado'].forEach(estado => {
      result[estado] = ticketsMes.filter(t => t.estado === estado).length
    })
    result['Total'] = ticketsMes.length
    return result
  })

  // 3. Tickets por estado (dona)
  const porEstado = Object.entries(
    tickets.reduce((acc, t) => {
      acc[t.estado] = (acc[t.estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // 4. Tickets por técnico (barras)
  const porTecnico = Object.entries(
    tickets
      .filter(t => t.tecnicos?.nombre_completo)
      .reduce((acc, t) => {
        const nombre = t.tecnicos!.nombre_completo.split(' ').slice(0, 2).join(' ')
        acc[nombre] = (acc[nombre] || 0) + 1
        return acc
      }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // 5. Productos más vendidos (barras horizontales)
  const productosVendidos: Record<string, number> = {}
  ventas.forEach(v => {
    if (Array.isArray(v.items)) {
      v.items.forEach((item) => {
        productosVendidos[item.nombre_producto] = (productosVendidos[item.nombre_producto] || 0) + item.cantidad
      })
    }
  })
  const topProductos = Object.entries(productosVendidos)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // 6. Métodos de pago (dona)
  const porMetodoPago = Object.entries(
    ventas.reduce((acc, v) => {
      const label = v.metodo_pago === 'efectivo' ? 'Efectivo' : v.metodo_pago === 'yape' ? 'Yape' :
        v.metodo_pago === 'plin' ? 'Plin' : v.metodo_pago === 'transferencia' ? 'Transferencia' : 'Tarjeta'
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  // 7. KPIs resumen
  const hoy = new Date().toISOString().split('T')[0]
  const mesActual = getMesKey(new Date().toISOString())
  const mesAnterior = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const ingresosMesActual = ventas.filter(v => getMesKey(v.created_at) === mesActual).reduce((a, v) => a + v.total, 0)
  const ingresosMesAnterior = ventas.filter(v => getMesKey(v.created_at) === mesAnterior).reduce((a, v) => a + v.total, 0)
  const ticketsMesActual = tickets.filter(t => getMesKey(t.fecha_creacion) === mesActual).length
  const ticketsCompletados = tickets.filter(t => t.estado === 'Completado' || t.estado === 'Cerrado' || t.estado === 'Facturado').length
  const tasaResolucion = tickets.length > 0 ? Math.round((ticketsCompletados / tickets.length) * 100) : 0
  const ticketsHoy = tickets.filter(t => t.fecha_creacion.startsWith(hoy)).length
  const ventasHoy = ventas.filter(v => v.created_at.startsWith(hoy))
  const ingresosHoy = ventasHoy.reduce((a, v) => a + v.total, 0)
  const variacionIngresos = ingresosMesAnterior > 0
    ? Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100)
    : 0

  // 8. Prioridad tickets activos (dona)
  const ticketsActivos = tickets.filter(t => ['Nuevo','Asignado','En progreso','En espera'].includes(t.estado))
  const porPrioridad = ['Urgente','Alta','Normal','Bajo'].map(p => ({
    name: p,
    value: ticketsActivos.filter(t => t.prioridad === p).length,
  })).filter(p => p.value > 0)

  const COLORES_PRIORIDAD: Record<string, string> = {
    Urgente: '#ef4444', Alta: '#f97316', Normal: '#3b82f6', Bajo: '#6b7280',
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/dashboard" className="hover:text-blue-600">Dashboard</a>
              <span>›</span>
              <span className="text-gray-700 font-medium">Reportes</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Análisis de ventas, tickets y productos</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector período */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPeriodo(6)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 6 ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >6 meses</button>
              <button
                onClick={() => setPeriodo(12)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 12 ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >12 meses</button>
            </div>
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

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Calculando reportes...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Ingresos este mes"
                value={formatCurrencyShort(ingresosMesActual)}
                sub={variacionIngresos !== 0 ? `${variacionIngresos > 0 ? '↑' : '↓'} ${Math.abs(variacionIngresos)}% vs mes anterior` : 'Sin datos del mes anterior'}
                trendPositive={variacionIngresos >= 0}
                icon="💰"
                bg="bg-blue-50 border-blue-100"
                textColor="text-blue-700"
              />
              <KpiCard
                label="Tickets este mes"
                value={ticketsMesActual}
                sub={`${ticketsHoy} hoy`}
                icon="🎫"
                bg="bg-purple-50 border-purple-100"
                textColor="text-purple-700"
              />
              <KpiCard
                label="Tasa de resolución"
                value={`${tasaResolucion}%`}
                sub={`${ticketsCompletados} de ${tickets.length} tickets`}
                icon="✅"
                bg={tasaResolucion >= 70 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}
                textColor={tasaResolucion >= 70 ? 'text-green-700' : 'text-amber-700'}
              />
              <KpiCard
                label="Ingresos hoy"
                value={formatCurrencyShort(ingresosHoy)}
                sub={`${ventasHoy.length} venta${ventasHoy.length !== 1 ? 's' : ''}`}
                icon="📈"
                bg="bg-green-50 border-green-100"
                textColor="text-green-700"
              />
            </div>

            {/* ── Ingresos por mes (barras + línea) ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Ingresos por mes</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Ventas de accesorios — últimos {periodo} meses</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{formatCurrencyShort(ventas.reduce((a, v) => a + v.total, 0))}</p>
                  <p className="text-xs text-gray-400">Total histórico</p>
                </div>
              </div>
              {ventas.length === 0 ? (
                <EmptyChart mensaje="No hay ventas registradas aún" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dataVentasMes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tickFormatter={v => `S/${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipVentas />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    <Line yAxisId="right" type="monotone" dataKey="N° Ventas" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Tickets por mes + Tickets por estado ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Tickets por mes */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Tickets por mes</h2>
                <p className="text-xs text-gray-400 mb-4">Últimos {periodo} meses por estado</p>
                {tickets.length === 0 ? (
                  <EmptyChart mensaje="No hay tickets aún" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dataTicketsMes} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipTickets />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Nuevo" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} maxBarSize={40} />
                      <Bar dataKey="En progreso" stackId="a" fill="#f59e0b" maxBarSize={40} />
                      <Bar dataKey="Completado" stackId="a" fill="#10b981" maxBarSize={40} />
                      <Bar dataKey="Cancelado" stackId="a" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Tickets por estado (dona) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Distribución por estado</h2>
                <p className="text-xs text-gray-400 mb-4">Total histórico de tickets</p>
                {porEstado.length === 0 ? (
                  <EmptyChart mensaje="No hay tickets aún" />
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={porEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {porEstado.map((entry, i) => (
                            <Cell key={i} fill={COLORES_ESTADO[entry.name] || COLORES[i % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {porEstado.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORES_ESTADO[entry.name] || COLORES[i % COLORES.length] }} />
                            <span className="text-xs text-gray-600 truncate">{entry.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800 flex-shrink-0">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Productos más vendidos + Métodos de pago ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Top productos (2/3) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Productos más vendidos</h2>
                <p className="text-xs text-gray-400 mb-4">Por cantidad de unidades vendidas</p>
                {topProductos.length === 0 ? (
                  <EmptyChart mensaje="No hay ventas con productos aún" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topProductos} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v} unidades`, 'Vendidos']} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {topProductos.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Métodos de pago (1/3) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Métodos de pago</h2>
                <p className="text-xs text-gray-400 mb-4">Preferencia de clientes</p>
                {porMetodoPago.length === 0 ? (
                  <EmptyChart mensaje="Sin ventas aún" height={200} />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={porMetodoPago} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                          {porMetodoPago.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {porMetodoPago.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORES[i % COLORES.length] }} />
                            <span className="text-xs text-gray-600">{entry.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Tickets por técnico + Prioridad ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Por técnico */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Tickets por técnico</h2>
                <p className="text-xs text-gray-400 mb-4">Total histórico asignado</p>
                {porTecnico.length === 0 ? (
                  <EmptyChart mensaje="No hay tickets asignados a técnicos" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={porTecnico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [v, 'Tickets']} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {porTecnico.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Prioridad de tickets activos */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Prioridad — tickets activos</h2>
                <p className="text-xs text-gray-400 mb-4">{ticketsActivos.length} tickets en curso ahora</p>
                {porPrioridad.length === 0 ? (
                  <EmptyChart mensaje="No hay tickets activos" />
                ) : (
                  <div className="flex items-center gap-4 h-[220px]">
                    <ResponsiveContainer width="55%" height="100%">
                      <PieChart>
                        <Pie data={porPrioridad} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                          {porPrioridad.map((entry, i) => (
                            <Cell key={i} fill={COLORES_PRIORIDAD[entry.name] || COLORES[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {porPrioridad.map((entry, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium" style={{ color: COLORES_PRIORIDAD[entry.name] }}>{entry.name}</span>
                            <span className="font-bold text-gray-700">{entry.value}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${(entry.value / ticketsActivos.length) * 100}%`, backgroundColor: COLORES_PRIORIDAD[entry.name] }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Total activos</span>
                          <span className="font-bold text-gray-900">{ticketsActivos.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Tabla resumen vendedores ── */}
            {ventas.some(v => v.vendedor_nombre) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Rendimiento por vendedor</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 rounded-lg">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 rounded-l-lg">Vendedor</th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">N° Ventas</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Total vendido</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 rounded-r-lg">Promedio/venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(
                        ventas.filter(v => v.vendedor_nombre).reduce((acc, v) => {
                          const nombre = v.vendedor_nombre!
                          if (!acc[nombre]) acc[nombre] = { count: 0, total: 0 }
                          acc[nombre].count++
                          acc[nombre].total += v.total
                          return acc
                        }, {} as Record<string, { count: number; total: number }>)
                      )
                        .sort(([, a], [, b]) => b.total - a.total)
                        .map(([nombre, data], i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                  {nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{nombre}</span>
                                {i === 0 && <span className="text-xs">🥇</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center"><span className="text-sm font-bold text-gray-900">{data.count}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm font-bold text-green-600">{formatCurrency(data.total)}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm text-gray-600">{formatCurrency(data.total / data.count)}</span></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trendPositive, icon, bg, textColor }: {
  label: string; value: string | number; sub?: string
  trendPositive?: boolean; icon: string; bg: string; textColor: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {sub && (
        <div className={`text-xs mt-1 ${trendPositive === undefined ? 'text-gray-400' : trendPositive ? 'text-green-600' : 'text-red-500'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

function EmptyChart({ mensaje, height = 240 }: { mensaje: string; height?: number }) {
  return (
    <div className="flex items-center justify-center text-center text-gray-300" style={{ height }}>
      <div>
        <div className="text-4xl mb-2">📊</div>
        <p className="text-sm">{mensaje}</p>
      </div>
    </div>
  )
}
