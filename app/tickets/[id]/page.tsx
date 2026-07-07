'use client'

import { useState, useEffect, use } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type Ticket = {
  id: string
  numero_ticket: number
  descripcion_problema: string
  prioridad: string
  estado: string
  tipo_equipo: string | null
  marca_equipo: string | null
  modelo_equipo: string | null
  serie_equipo: string | null
  sistema_operativo: string | null
  descripcion_equipo: string | null
  fecha_creacion: string
  fecha_promesa: string | null
  fecha_inicio: string | null
  fecha_termino: string | null
  observaciones: string | null
  clientes?: { nombre_completo: string; telefono_1: string | null; email: string | null; direccion: string | null }
  tecnicos?: { nombre_completo: string; telefono: string | null } | null
  tipos_servicio?: { nombre: string; precio_base: number | null } | null
}

type BitacoraEvento = {
  id: string
  ticket_id: string
  tipo_evento: string
  descripcion: string
  autor_nombre: string
  created_at: string
}

type Repuesto = {
  id: string
  ticket_id: string
  inventario_id: string | null
  nombre_repuesto: string
  cantidad: number
  precio_unitario: number | null
  estado: string
  solicitado_por: string
  aprobado_por: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

type VentaVinculada = {
  id: string
  numero_venta: number
  total: number
  metodo_pago: string
  vendedor_nombre: string | null
  created_at: string
  items: { nombre_producto: string; cantidad: number; precio_unitario: number; subtotal: number }[]
}

type Personal = { id: string; nombre_completo: string; rol: string }
type ItemInventario = { id: string; nombre: string; stock_actual: number; precio_venta: number | null }

// ── Helpers ────────────────────────────────────────────────────────────────
const TIPO_EVENTO_LABEL: Record<string, string> = {
  diagnostico: '🔍 Diagnóstico',
  reparacion: '🔧 Reparación',
  llamada_cliente: '📞 Llamada al cliente',
  solicitud_repuesto: '📦 Solicitud de repuesto',
  entrega_repuesto: '✅ Entrega de repuesto',
  pruebas: '🧪 Pruebas',
  entrega_equipo: '🤝 Entrega del equipo',
  nota_interna: '📝 Nota interna',
  cambio_estado: '🔄 Cambio de estado',
  cambio_fecha: '📅 Cambio de fecha de entrega',
}

const ESTADO_REPUESTO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  pedido_lima: 'bg-purple-100 text-purple-700',
  recibido: 'bg-blue-100 text-blue-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
}

const ESTADO_REPUESTO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pedido_lima: 'Pedido a Lima',
  recibido: 'Recibido en tienda',
  entregado: 'Entregado al técnico',
  cancelado: 'Cancelado',
}

const ESTADOS_TICKET = ['Nuevo','Asignado','En progreso','En espera','Completado','Cerrado','Facturado','Cancelado']

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
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

type SemaforoInfo = { color: 'rojo' | 'naranja' | 'amarillo' | 'verde' | 'gris'; texto: string; bg: string; text: string; dot: string }

function getSemaforo(fechaPromesa: string | null, estado: string): SemaforoInfo {
  const ESTADOS_FINALES = ['Completado', 'Cerrado', 'Cancelado', 'Facturado']
  if (!fechaPromesa || ESTADOS_FINALES.includes(estado)) {
    return { color: 'gris', texto: 'Sin urgencia', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', dot: 'bg-gray-300' }
  }
  const ahora = Date.now()
  const promesa = new Date(fechaPromesa).getTime()
  const horasRestantes = (promesa - ahora) / (1000 * 60 * 60)
  const diasRestantes = horasRestantes / 24

  if (horasRestantes < 24) {
    const vencido = horasRestantes < 0
    return {
      color: 'rojo',
      texto: vencido ? `Vencido hace ${Math.ceil(Math.abs(horasRestantes))}h` : `Vence en ${Math.ceil(horasRestantes)}h`,
      bg: 'bg-red-50 border-red-300', text: 'text-red-700', dot: 'bg-red-500',
    }
  }
  if (diasRestantes <= 2) {
    return { color: 'naranja', texto: `Vence en ${Math.ceil(diasRestantes)} día${Math.ceil(diasRestantes) > 1 ? 's' : ''}`, bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' }
  }
  if (diasRestantes <= 5) {
    return { color: 'amarillo', texto: `Vence en ${Math.ceil(diasRestantes)} días`, bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' }
  }
  return { color: 'verde', texto: `Vence en ${Math.ceil(diasRestantes)} días`, bg: 'bg-green-50 border-green-300', text: 'text-green-700', dot: 'bg-green-500' }
}

// ── Componente principal ───────────────────────────────────────────────────
export default function TicketDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [bitacora, setBitacora] = useState<BitacoraEvento[]>([])
  const [repuestos, setRepuestos] = useState<Repuesto[]>([])
  const [ventas, setVentas] = useState<VentaVinculada[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  const [inventario, setInventario] = useState<ItemInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pestana, setPestana] = useState<'bitacora' | 'repuestos' | 'ventas'>('bitacora')

  // Modales
  const [modalBitacora, setModalBitacora] = useState(false)
  const [modalRepuesto, setModalRepuesto] = useState(false)
  const [modalVenta, setModalVenta] = useState(false)
  const [modalEstado, setModalEstado] = useState(false)
  const [modalFecha, setModalFecha] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)

  // Forms
  const [formBitacora, setFormBitacora] = useState({ tipo_evento: 'diagnostico', descripcion: '', autor_nombre: '' })
  const [formRepuesto, setFormRepuesto] = useState({ nombre_repuesto: '', cantidad: 1, precio_unitario: '', solicitado_por: '', inventario_id: '', notas: '' })
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [autorEstado, setAutorEstado] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [motivoFecha, setMotivoFecha] = useState('')
  const [autorFecha, setAutorFecha] = useState('')

  // Venta vinculada
  const [carritoVenta, setCarritoVenta] = useState<{ inventario_id: string; nombre_producto: string; cantidad: number; precio_unitario: number; subtotal: number; stock_disponible: number }[]>([])
  const [metodoPagoVenta, setMetodoPagoVenta] = useState('efectivo')
  const [vendedorVenta, setVendedorVenta] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productoSel, setProductoSel] = useState<ItemInventario | null>(null)
  const [cantidadProd, setCantidadProd] = useState(1)

  // ── Carga ─────────────────────────────────────────────────────────────────
  async function cargarTodo() {
    try {
      setLoading(true); setError(null)
      const { supabase } = await import('@/lib/supabase')
      const { obtenerPersonal } = await import('@/lib/db')

      const [ticketRes, bitacoraRes, repuestosRes, ventasRes, inv, per] = await Promise.all([
        supabase.from('tickets').select('*, clientes(nombre_completo,telefono_1,email,direccion), tecnicos(nombre_completo,telefono), tipos_servicio(nombre,precio_base)').eq('id', id).single(),
        supabase.from('ticket_bitacora').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
        supabase.from('ticket_repuestos').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
        supabase.from('ventas_accesorios').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
        supabase.from('inventario').select('id,nombre,stock_actual,precio_venta').gt('stock_actual', 0).order('nombre'),
        obtenerPersonal(),
      ])

      if (ticketRes.error) throw ticketRes.error
      setTicket(ticketRes.data as Ticket)
      setBitacora((bitacoraRes.data ?? []) as BitacoraEvento[])
      setRepuestos((repuestosRes.data ?? []) as Repuesto[])
      setVentas((ventasRes.data ?? []) as VentaVinculada[])
      setInventario((inv.data ?? []) as ItemInventario[])
      setPersonal(per as Personal[])
      setNuevoEstado(ticketRes.data.estado)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarTodo() }, [id])

  // ── Guardar bitácora ───────────────────────────────────────────────────────
  async function guardarBitacora() {
    if (!formBitacora.descripcion.trim()) { setErrForm('La descripción es obligatoria'); return }
    if (!formBitacora.autor_nombre.trim()) { setErrForm('El autor es obligatorio'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.from('ticket_bitacora').insert([{ ticket_id: id, ...formBitacora }])
      if (error) throw error
      setModalBitacora(false)
      setFormBitacora({ tipo_evento: 'diagnostico', descripcion: '', autor_nombre: '' })
      await cargarTodo()
    } catch (e: unknown) { setErrForm(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(false) }
  }

  // ── Guardar solicitud repuesto ─────────────────────────────────────────────
  async function guardarRepuesto() {
    if (!formRepuesto.nombre_repuesto.trim()) { setErrForm('El nombre del repuesto es obligatorio'); return }
    if (!formRepuesto.solicitado_por.trim()) { setErrForm('Indica quién solicita'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const payload = {
        ticket_id: id,
        nombre_repuesto: formRepuesto.nombre_repuesto.trim(),
        cantidad: formRepuesto.cantidad,
        precio_unitario: formRepuesto.precio_unitario ? Number(formRepuesto.precio_unitario) : null,
        solicitado_por: formRepuesto.solicitado_por.trim(),
        inventario_id: formRepuesto.inventario_id || null,
        notas: formRepuesto.notas || null,
        estado: 'pendiente',
      }
      const { error } = await supabase.from('ticket_repuestos').insert([payload])
      if (error) throw error

      // Registrar en bitácora automáticamente
      await supabase.from('ticket_bitacora').insert([{
        ticket_id: id,
        tipo_evento: 'solicitud_repuesto',
        descripcion: `Se solicitó: ${formRepuesto.nombre_repuesto} (x${formRepuesto.cantidad})`,
        autor_nombre: formRepuesto.solicitado_por,
      }])

      setModalRepuesto(false)
      setFormRepuesto({ nombre_repuesto: '', cantidad: 1, precio_unitario: '', solicitado_por: '', inventario_id: '', notas: '' })
      setBusquedaRepuesto('')
      await cargarTodo()
    } catch (e: unknown) { setErrForm(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(false) }
  }

  // ── Actualizar estado repuesto ─────────────────────────────────────────────
  async function actualizarEstadoRepuesto(repuestoId: string, nuevoEstadoRep: string, aprobadoPor?: string) {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('ticket_repuestos').update({
        estado: nuevoEstadoRep,
        aprobado_por: aprobadoPor || null,
        updated_at: new Date().toISOString(),
      }).eq('id', repuestoId)

      // Registrar en bitácora
      const repuesto = repuestos.find(r => r.id === repuestoId)
      if (repuesto) {
        await supabase.from('ticket_bitacora').insert([{
          ticket_id: id,
          tipo_evento: nuevoEstadoRep === 'entregado' ? 'entrega_repuesto' : 'nota_interna',
          descripcion: `Repuesto "${repuesto.nombre_repuesto}" → ${ESTADO_REPUESTO_LABEL[nuevoEstadoRep]}`,
          autor_nombre: aprobadoPor || 'Sistema',
        }])
      }
      await cargarTodo()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  // ── Cambiar estado ticket ──────────────────────────────────────────────────
  async function cambiarEstadoTicket() {
    if (!autorEstado.trim()) { setErrForm('Indica quién realiza el cambio'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('tickets').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('ticket_bitacora').insert([{
        ticket_id: id,
        tipo_evento: 'cambio_estado',
        descripcion: `Estado cambiado de "${ticket?.estado}" a "${nuevoEstado}"`,
        autor_nombre: autorEstado,
      }])
      setModalEstado(false); setAutorEstado(''); await cargarTodo()
    } catch (e: unknown) { setErrForm(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(false) }
  }

  // ── Reprogramar fecha de promesa ───────────────────────────────────────────
  async function reprogramarFecha() {
    if (!nuevaFecha) { setErrForm('Selecciona la nueva fecha'); return }
    if (!motivoFecha.trim()) { setErrForm('Explica el motivo del cambio'); return }
    if (!autorFecha.trim()) { setErrForm('Indica quién hace el cambio'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const fechaAnteriorStr = ticket?.fecha_promesa ? formatFechaCorta(ticket.fecha_promesa) : 'sin fecha previa'
      await supabase.from('tickets').update({ fecha_promesa: nuevaFecha, updated_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('ticket_bitacora').insert([{
        ticket_id: id,
        tipo_evento: 'cambio_fecha',
        descripcion: `Fecha de entrega reprogramada: ${fechaAnteriorStr} → ${formatFechaCorta(nuevaFecha)}. Motivo: ${motivoFecha.trim()}`,
        autor_nombre: autorFecha,
      }])
      setModalFecha(false); setNuevaFecha(''); setMotivoFecha(''); setAutorFecha('')
      await cargarTodo()
    } catch (e: unknown) { setErrForm(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(false) }
  }

  // ── Venta vinculada ────────────────────────────────────────────────────────
  function agregarProductoCarrito() {
    if (!productoSel) return
    const existe = carritoVenta.find(i => i.inventario_id === productoSel.id)
    if (existe) {
      setCarritoVenta(carritoVenta.map(i => i.inventario_id === productoSel.id
        ? { ...i, cantidad: i.cantidad + cantidadProd, subtotal: (i.cantidad + cantidadProd) * i.precio_unitario }
        : i))
    } else {
      const precio = productoSel.precio_venta ?? 0
      setCarritoVenta([...carritoVenta, {
        inventario_id: productoSel.id, nombre_producto: productoSel.nombre,
        cantidad: cantidadProd, precio_unitario: precio, subtotal: cantidadProd * precio,
        stock_disponible: productoSel.stock_actual,
      }])
    }
    setProductoSel(null); setBusquedaProducto(''); setCantidadProd(1)
  }

  async function guardarVentaVinculada() {
    if (carritoVenta.length === 0) { setErrForm('Agrega al menos un producto'); return }
    if (!vendedorVenta.trim()) { setErrForm('Indica el vendedor'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { crearVenta } = await import('@/lib/db')
      const { supabase } = await import('@/lib/supabase')
      const subtotal = carritoVenta.reduce((a, i) => a + i.subtotal, 0)
      const venta = await crearVenta({
        cliente_id: ticket?.clientes ? undefined : null,
        nombre_cliente_libre: ticket?.clientes?.nombre_completo ?? 'Cliente del ticket',
        metodo_pago: metodoPagoVenta as 'efectivo',
        items: carritoVenta,
        subtotal, descuento: 0, total: subtotal,
        vendedor_nombre: vendedorVenta,
      })
      // Vincular al ticket
      await supabase.from('ventas_accesorios').update({ ticket_id: id }).eq('id', venta.id)
      // Registrar en bitácora
      await supabase.from('ticket_bitacora').insert([{
        ticket_id: id,
        tipo_evento: 'nota_interna',
        descripcion: `Venta #${venta.numero_venta} registrada: ${carritoVenta.map(i => `${i.nombre_producto} x${i.cantidad}`).join(', ')} — Total: S/ ${subtotal.toFixed(2)}`,
        autor_nombre: vendedorVenta,
      }])
      setModalVenta(false); setCarritoVenta([]); setVendedorVenta(''); setMetodoPagoVenta('efectivo')
      await cargarTodo()
    } catch (e: unknown) { setErrForm(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(false) }
  }

  const productosFiltrados = inventario.filter(p => {
    const q = busquedaProducto.toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q)
  }).slice(0, 6)

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Cargando ticket...</p>
      </div>
    </div>
  )

  if (error || !ticket) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-sm text-red-600">{error ?? 'Ticket no encontrado'}</p>
        <a href="/tickets" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Volver a tickets</a>
      </div>
    </div>
  )

  const totalVentas = ventas.reduce((a, v) => a + v.total, 0)
  const semaforo = getSemaforo(ticket.fecha_promesa, ticket.estado)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banda de urgencia */}
      {semaforo.color !== 'gris' && (
        <div className={`${semaforo.bg} border-b-2`} style={{ borderColor: 'inherit' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${semaforo.dot} animate-pulse`} />
            <span className={`text-sm font-semibold ${semaforo.text}`}>{semaforo.texto}</span>
            {ticket.fecha_promesa && <span className="text-xs text-gray-400">· Fecha acordada: {formatFechaCorta(ticket.fecha_promesa)}</span>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/dashboard" className="hover:text-blue-600">Dashboard</a>
            <span>›</span>
            <a href="/tickets" className="hover:text-blue-600">Tickets</a>
            <span>›</span>
            <span className="text-gray-700 font-medium">#{ticket.numero_ticket}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">Ticket #{ticket.numero_ticket}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORES_ESTADO[ticket.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ticket.estado}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.prioridad === 'Urgente' ? 'bg-red-100 text-red-700' : ticket.prioridad === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ticket.prioridad}
                </span>
              </div>
              <p className="text-sm text-gray-600">{ticket.descripcion_problema}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setModalFecha(true); setErrForm(null); setNuevaFecha(ticket.fecha_promesa?.slice(0, 16) ?? '') }}
                className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                📅 {ticket.fecha_promesa ? 'Reprogramar' : 'Fijar fecha'}
              </button>
              <button
                onClick={() => { setModalEstado(true); setErrForm(null) }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                🔄 Cambiar estado
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Info general */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">👤 Cliente</p>
            <p className="font-semibold text-gray-900">{ticket.clientes?.nombre_completo ?? '—'}</p>
            {ticket.clientes?.telefono_1 && <p className="text-xs text-gray-500 mt-0.5">{ticket.clientes.telefono_1}</p>}
            {ticket.clientes?.email && <p className="text-xs text-gray-400 truncate">{ticket.clientes.email}</p>}
          </div>
          {/* Técnico y servicio */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🔧 Técnico / Servicio</p>
            <p className="font-semibold text-gray-900">{ticket.tecnicos?.nombre_completo ?? <span className="text-gray-400 font-normal italic">Sin asignar</span>}</p>
            <p className="text-xs text-blue-600 mt-0.5">{ticket.tipos_servicio?.nombre ?? '—'}</p>
            {ticket.tipos_servicio?.precio_base && <p className="text-xs text-gray-400">Precio base: S/ {ticket.tipos_servicio.precio_base}</p>}
          </div>
          {/* Equipo y fechas */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">💻 Equipo</p>
            <p className="font-semibold text-gray-900">{[ticket.tipo_equipo, ticket.marca_equipo, ticket.modelo_equipo].filter(Boolean).join(' · ') || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Creado: {formatFechaCorta(ticket.fecha_creacion)}</p>
            {ticket.fecha_promesa && (
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border ${semaforo.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${semaforo.dot}`} />
                <span className={`text-xs font-medium ${semaforo.text}`}>{semaforo.texto}</span>
              </div>
            )}
            {ticket.fecha_termino && <p className="text-xs text-green-600 mt-1">Terminado: {formatFechaCorta(ticket.fecha_termino)}</p>}
          </div>
        </div>

        {/* Detalle completo del problema y equipo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📝 Detalle del problema</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{ticket.descripcion_problema}</p>

          {(ticket.serie_equipo || ticket.sistema_operativo) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pt-3 border-t border-gray-100">
              {ticket.serie_equipo && (
                <div>
                  <p className="text-xs text-gray-400">N° de serie</p>
                  <p className="text-sm text-gray-700 font-mono">{ticket.serie_equipo}</p>
                </div>
              )}
              {ticket.sistema_operativo && (
                <div>
                  <p className="text-xs text-gray-400">Sistema operativo</p>
                  <p className="text-sm text-gray-700">{ticket.sistema_operativo}</p>
                </div>
              )}
            </div>
          )}

          {ticket.descripcion_equipo && (
            <div className="pt-3 border-t border-gray-100 mb-4">
              <p className="text-xs text-gray-400 mb-1">Descripción del equipo</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.descripcion_equipo}</p>
            </div>
          )}

          {ticket.observaciones && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Observaciones</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.observaciones}</p>
            </div>
          )}

          {!ticket.serie_equipo && !ticket.sistema_operativo && !ticket.descripcion_equipo && !ticket.observaciones && (
            <p className="text-xs text-gray-300 italic pt-3 border-t border-gray-100">Sin información adicional registrada</p>
          )}
        </div>

        {/* Pestañas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-200">
            {([
              { key: 'bitacora', label: `📋 Bitácora`, count: bitacora.length },
              { key: 'repuestos', label: `🔩 Repuestos`, count: repuestos.length },
              { key: 'ventas', label: `🛒 Ventas`, count: ventas.length },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setPestana(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${pestana === tab.key ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${pestana === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── PESTAÑA BITÁCORA ── */}
          {pestana === 'bitacora' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Historial completo de avances del ticket</p>
                <button
                  onClick={() => { setModalBitacora(true); setErrForm(null) }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Agregar avance
                </button>
              </div>

              {bitacora.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-400 text-sm">Sin avances registrados aún</p>
                  <p className="text-gray-300 text-xs mt-1">Agrega el primer avance con el botón de arriba</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                  <div className="space-y-4">
                    {bitacora.map((evento, i) => (
                      <div key={evento.id} className="relative flex gap-4 pl-10">
                        {/* Punto en la línea */}
                        <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-800">
                              {TIPO_EVENTO_LABEL[evento.tipo_evento] ?? evento.tipo_evento}
                            </span>
                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{formatFecha(evento.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{evento.descripcion}</p>
                          <p className="text-xs text-gray-400 mt-1.5">— {evento.autor_nombre}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PESTAÑA REPUESTOS ── */}
          {pestana === 'repuestos' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Solicitudes de repuestos para este ticket</p>
                <button
                  onClick={() => { setModalRepuesto(true); setErrForm(null) }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Solicitar repuesto
                </button>
              </div>

              {repuestos.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">🔩</div>
                  <p className="text-gray-400 text-sm">Sin solicitudes de repuesto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repuestos.map(rep => (
                    <div key={rep.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{rep.nombre_repuesto}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Cantidad: {rep.cantidad}</span>
                            {rep.precio_unitario && <span>Precio: S/ {rep.precio_unitario}</span>}
                            <span>Solicitado por: {rep.solicitado_por}</span>
                          </div>
                          {rep.notas && <p className="text-xs text-gray-400 mt-1 italic">{rep.notas}</p>}
                          {rep.aprobado_por && <p className="text-xs text-green-600 mt-1">Aprobado por: {rep.aprobado_por}</p>}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${ESTADO_REPUESTO_COLOR[rep.estado]}`}>
                          {ESTADO_REPUESTO_LABEL[rep.estado]}
                        </span>
                      </div>

                      {/* Acciones según estado */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                        {rep.estado === 'pendiente' && (
                          <>
                            <button onClick={() => {
                              const autor = prompt('¿Quién aprueba?')
                              if (autor) actualizarEstadoRepuesto(rep.id, 'entregado', autor)
                            }} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              ✅ Aprobar — hay stock, entregar directo
                            </button>
                            <button onClick={() => {
                              const autor = prompt('¿Quién aprueba?')
                              if (autor) actualizarEstadoRepuesto(rep.id, 'pedido_lima', autor)
                            }} className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              🚚 Aprobar — pedir a Lima
                            </button>
                            <button onClick={() => actualizarEstadoRepuesto(rep.id, 'cancelado')} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              ❌ Cancelar
                            </button>
                          </>
                        )}
                        {rep.estado === 'pedido_lima' && (
                          <button onClick={() => actualizarEstadoRepuesto(rep.id, 'recibido')} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            📦 Marcar como recibido en tienda
                          </button>
                        )}
                        {rep.estado === 'recibido' && (
                          <button onClick={() => actualizarEstadoRepuesto(rep.id, 'entregado')} className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            🤝 Marcar como entregado al técnico
                          </button>
                        )}
                        <span className="text-xs text-gray-300 self-center">{formatFecha(rep.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PESTAÑA VENTAS ── */}
          {pestana === 'ventas' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Productos vendidos dentro de este ticket</p>
                  {ventas.length > 0 && <p className="text-xs text-green-600 font-medium mt-0.5">Total cobrado: S/ {totalVentas.toFixed(2)}</p>}
                </div>
                <button
                  onClick={() => { setModalVenta(true); setCarritoVenta([]); setErrForm(null) }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Registrar venta
                </button>
              </div>

              {ventas.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-gray-400 text-sm">Sin ventas registradas en este ticket</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ventas.map(venta => (
                    <div key={venta.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">Venta #{venta.numero_venta}</p>
                          <p className="text-xs text-gray-400">{formatFecha(venta.created_at)} · {venta.vendedor_nombre}</p>
                        </div>
                        <span className="text-base font-bold text-green-600">S/ {venta.total.toFixed(2)}</span>
                      </div>
                      {Array.isArray(venta.items) && venta.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500 py-0.5">
                          <span>{item.nombre_producto} × {item.cantidad}</span>
                          <span>S/ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL AGREGAR AVANCE BITÁCORA ─────────────────────────────────── */}
      {modalBitacora && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalBitacora(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Registrar avance</h2>
                <button onClick={() => !guardando && setModalBitacora(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de evento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TIPO_EVENTO_LABEL).filter(([k]) => k !== 'solicitud_repuesto' && k !== 'entrega_repuesto').map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFormBitacora({ ...formBitacora, tipo_evento: key })}
                        className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${formBitacora.tipo_evento === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                  <textarea
                    value={formBitacora.descripcion}
                    onChange={e => setFormBitacora({ ...formBitacora, descripcion: e.target.value })}
                    placeholder="Describe el avance realizado..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autor <span className="text-red-500">*</span></label>
                  <select
                    value={formBitacora.autor_nombre}
                    onChange={e => setFormBitacora({ ...formBitacora, autor_nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Selecciona quién registra —</option>
                    {personal.map(p => <option key={p.id} value={p.nombre_completo}>{p.nombre_completo} ({p.rol})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalBitacora(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardarBitacora} disabled={guardando} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : 'Registrar avance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SOLICITAR REPUESTO ───────────────────────────────────────── */}
      {modalRepuesto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalRepuesto(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Solicitar repuesto</h2>
                <button onClick={() => !guardando && setModalRepuesto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  💡 La solicitud llegará al administrador o vendedor para su aprobación. Ellos gestionan el pedido y el stock.
                </div>

                {/* Buscar en inventario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar en inventario existente</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe para buscar..."
                      value={busquedaRepuesto}
                      onChange={e => setBusquedaRepuesto(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {busquedaRepuesto && (
                    <div className="mt-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      {inventario.filter(p => p.nombre.toLowerCase().includes(busquedaRepuesto.toLowerCase())).slice(0, 5).map(p => (
                        <button key={p.id} onClick={() => {
                          setFormRepuesto({ ...formRepuesto, nombre_repuesto: p.nombre, inventario_id: p.id, precio_unitario: String(p.precio_venta ?? ''), solicitado_por: 'Técnico' })
                          setBusquedaRepuesto('')
                        }} className="w-full flex justify-between px-3 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">
                          <span>{p.nombre}</span>
                          <span className="text-gray-400 text-xs">{p.stock_actual} en stock</span>
                        </button>
                      ))}
                      {inventario.filter(p => p.nombre.toLowerCase().includes(busquedaRepuesto.toLowerCase())).length === 0 && (
                        <p className="text-xs text-gray-400 p-3 text-center">No encontrado — puedes escribirlo manualmente abajo</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del repuesto <span className="text-red-500">*</span></label>
                  <input type="text" value={formRepuesto.nombre_repuesto} onChange={e => setFormRepuesto({ ...formRepuesto, nombre_repuesto: e.target.value, solicitado_por: 'Técnico' })} placeholder="Ej: Disco SSD 500GB, Ventilador CPU..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
                    <input type="number" min={1} value={formRepuesto.cantidad} onChange={e => setFormRepuesto({ ...formRepuesto, cantidad: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio referencial</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                      <input
                        type="number"
                        value={formRepuesto.precio_unitario}
                        readOnly
                        className="w-full border border-gray-100 rounded-lg pl-8 pr-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        placeholder="—"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Precio del inventario (solo lectura)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
                  <textarea value={formRepuesto.notas} onChange={e => setFormRepuesto({ ...formRepuesto, notas: e.target.value })} placeholder="Especificaciones, urgencia, modelo exacto requerido..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalRepuesto(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardarRepuesto} disabled={guardando} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VENTA VINCULADA ──────────────────────────────────────────── */}
      {modalVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalVenta(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Venta vinculada al ticket</h2>
                <button onClick={() => !guardando && setModalVenta(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                {/* Buscador producto */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" placeholder="Buscar producto..." value={busquedaProducto} onChange={e => { setBusquedaProducto(e.target.value); setProductoSel(null) }} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  {busquedaProducto && !productoSel && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {productosFiltrados.length === 0 ? <p className="text-sm text-gray-400 p-3 text-center">Sin resultados</p> :
                        productosFiltrados.map(p => (
                          <button key={p.id} onClick={() => { setProductoSel(p); setBusquedaProducto(p.nombre) }} className="w-full flex justify-between px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">
                            <span>{p.nombre}</span>
                            <span className="text-blue-600 font-bold">S/ {p.precio_venta?.toFixed(2)}</span>
                          </button>
                        ))}
                    </div>
                  )}
                  {productoSel && (
                    <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex-1"><p className="text-sm font-medium text-gray-900">{productoSel.nombre}</p><p className="text-xs text-gray-400">Stock: {productoSel.stock_actual}</p></div>
                      <input type="number" min={1} max={productoSel.stock_actual} value={cantidadProd} onChange={e => setCantidadProd(Math.max(1, Number(e.target.value)))} className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={agregarProductoCarrito} className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Agregar</button>
                    </div>
                  )}
                </div>

                {/* Carrito */}
                {carritoVenta.length > 0 && (
                  <div className="space-y-2">
                    {carritoVenta.map(item => (
                      <div key={item.inventario_id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-900 truncate">{item.nombre_producto}</span>
                        <span className="text-xs text-gray-400">×{item.cantidad}</span>
                        <span className="text-sm font-bold text-gray-700">S/ {item.subtotal.toFixed(2)}</span>
                        <button onClick={() => setCarritoVenta(carritoVenta.filter(i => i.inventario_id !== item.inventario_id))} className="text-gray-300 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-gray-900 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                      <span>Total</span>
                      <span className="text-green-600">S/ {carritoVenta.reduce((a, i) => a + i.subtotal, 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Pago y vendedor */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['efectivo','yape','plin','transferencia','tarjeta'].map(m => (
                    <button key={m} onClick={() => setMetodoPagoVenta(m)} className={`py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${metodoPagoVenta === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{m}</button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor <span className="text-red-500">*</span></label>
                  <select value={vendedorVenta} onChange={e => setVendedorVenta(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Selecciona —</option>
                    {personal.map(p => <option key={p.id} value={p.nombre_completo}>{p.nombre_completo}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalVenta(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardarVentaVinculada} disabled={guardando || carritoVenta.length === 0} className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Registrando...' : `Confirmar · S/ ${carritoVenta.reduce((a, i) => a + i.subtotal, 0).toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REPROGRAMAR FECHA ───────────────────────────────────────── */}
      {modalFecha && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalFecha(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{ticket.fecha_promesa ? 'Reprogramar fecha de entrega' : 'Fijar fecha de entrega'}</h2>
                <button onClick={() => !guardando && setModalFecha(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                {ticket.fecha_promesa && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    Fecha actual: <strong>{formatFecha(ticket.fecha_promesa)}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha y hora de entrega <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={nuevaFecha}
                    onChange={e => setNuevaFecha(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {ticket.fecha_promesa ? 'Motivo del cambio' : 'Motivo / acuerdo con el cliente'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivoFecha}
                    onChange={e => setMotivoFecha(e.target.value)}
                    placeholder={ticket.fecha_promesa ? 'Ej: Repuesto llega tarde de Lima, cliente acordó nueva fecha...' : 'Ej: Cliente acordó recoger el jueves...'}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Este motivo quedará registrado en la bitácora del ticket.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién realiza el cambio? <span className="text-red-500">*</span></label>
                  <select value={autorFecha} onChange={e => setAutorFecha(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Selecciona —</option>
                    {personal.map(p => <option key={p.id} value={p.nombre_completo}>{p.nombre_completo}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalFecha(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={reprogramarFecha} disabled={guardando} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : 'Confirmar fecha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CAMBIAR ESTADO ───────────────────────────────────────────── */}
      {modalEstado && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalEstado(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Cambiar estado</h2>
                <button onClick={() => !guardando && setModalEstado(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo estado</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ESTADOS_TICKET.map(est => (
                      <button key={est} onClick={() => setNuevoEstado(est)} className={`text-sm py-2 px-3 rounded-lg border font-medium transition-colors ${nuevoEstado === est ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {est}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién realiza el cambio? <span className="text-red-500">*</span></label>
                  <select value={autorEstado} onChange={e => setAutorEstado(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Selecciona —</option>
                    {personal.map(p => <option key={p.id} value={p.nombre_completo}>{p.nombre_completo}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalEstado(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={cambiarEstadoTicket} disabled={guardando || nuevoEstado === ticket.estado} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
