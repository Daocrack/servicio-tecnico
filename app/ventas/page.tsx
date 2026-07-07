'use client'

import { useState, useEffect, useRef } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type MetodoPago = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta'

type ItemInventario = {
  id: string
  codigo: string | null
  nombre: string
  categoria: string
  stock_actual: number
  precio_venta: number | null
  unidad_medida: string
}

type ItemCarrito = {
  inventario_id: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  stock_disponible: number
}

type Venta = {
  id: string
  numero_venta: number
  cliente_id: string | null
  nombre_cliente_libre: string | null
  metodo_pago: MetodoPago
  items: ItemCarrito[]
  subtotal: number
  descuento: number
  total: number
  notas: string | null
  vendedor_nombre: string | null
  created_at: string
  clientes?: { nombre_completo: string; telefono_1?: string | null; dni_ruc?: string | null } | null
}

type Cliente = { id: string; nombre_completo: string; telefono_1: string | null; dni_ruc: string | null }

type Personal = { id: string; nombre_completo: string; rol: string }

// ── Helpers ────────────────────────────────────────────────────────────────
const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: '💵 Efectivo',
  yape: '📱 Yape',
  plin: '📱 Plin',
  transferencia: '🏦 Transferencia',
  tarjeta: '💳 Tarjeta',
}

function formatCurrency(v: number) { return `S/ ${v.toFixed(2)}` }
function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Componente principal ───────────────────────────────────────────────────
export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [inventario, setInventario] = useState<ItemInventario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [modalVenta, setModalVenta] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)
  const [ventaComprobante, setVentaComprobante] = useState<Venta | null>(null)
  const [ventaEliminar, setVentaEliminar] = useState<Venta | null>(null)
  const comprobanteRef = useRef<HTMLDivElement>(null)

  // Form
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [clienteId, setClienteId] = useState('')
  const [nombreClienteLibre, setNombreClienteLibre] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [notas, setNotas] = useState('')

  // Vendedor con buscador
  const [vendedorNombre, setVendedorNombre] = useState('')
  const [busquedaVendedor, setBusquedaVendedor] = useState('')
  const [mostrarDropdownVendedor, setMostrarDropdownVendedor] = useState(false)
  const vendedorRef = useRef<HTMLDivElement>(null)

  // Producto
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<ItemInventario | null>(null)
  const [cantidadAgregar, setCantidadAgregar] = useState(1)

  // Cerrar dropdown vendedor al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (vendedorRef.current && !vendedorRef.current.contains(e.target as Node)) {
        setMostrarDropdownVendedor(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Carga ────────────────────────────────────────────────────────────────
  async function cargarTodo() {
    try {
      setLoading(true); setError(null)
      const { obtenerVentas, obtenerInventario, obtenerClientes, obtenerPersonal } = await import('@/lib/db')
      const [v, inv, cl, per] = await Promise.all([
        obtenerVentas(), obtenerInventario(), obtenerClientes(), obtenerPersonal(),
      ])
      setVentas(v as Venta[])
      setInventario(inv.filter((i: ItemInventario) => i.stock_actual > 0) as ItemInventario[])
      setClientes(cl as Cliente[])
      setPersonal(per as Personal[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarTodo() }, [])

  // ── Métricas ─────────────────────────────────────────────────────────────
  const hoy = new Date().toISOString().split('T')[0]
  const ventasHoy = ventas.filter(v => v.created_at.startsWith(hoy))
  const totalHoy = ventasHoy.reduce((a, v) => a + v.total, 0)
  const getMes = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` }
  const ventasMes = ventas.filter(v => v.created_at.startsWith(getMes()))
  const totalMes = ventasMes.reduce((a, v) => a + v.total, 0)

  // ── Carrito ───────────────────────────────────────────────────────────────
  const subtotalCarrito = carrito.reduce((a, i) => a + i.subtotal, 0)
  const totalCarrito = Math.max(0, subtotalCarrito - descuento)

  const productosFiltrados = inventario.filter(p => {
    const q = busquedaProducto.toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q) || (p.codigo?.toLowerCase().includes(q) ?? false)
  }).slice(0, 8)

  // Personal filtrado para vendedor (case insensitive)
  const personalFiltrado = personal.filter(p =>
    !busquedaVendedor || p.nombre_completo.toLowerCase().includes(busquedaVendedor.toLowerCase())
  )

  function agregarAlCarrito() {
    if (!productoSeleccionado) return
    const existe = carrito.find(i => i.inventario_id === productoSeleccionado.id)
    const cantidadActual = existe?.cantidad ?? 0
    if (cantidadActual + cantidadAgregar > productoSeleccionado.stock_actual) {
      setErrForm(`Solo hay ${productoSeleccionado.stock_actual} unidades en stock`); return
    }
    setErrForm(null)
    if (existe) {
      setCarrito(carrito.map(i => i.inventario_id === productoSeleccionado.id
        ? { ...i, cantidad: i.cantidad + cantidadAgregar, subtotal: (i.cantidad + cantidadAgregar) * i.precio_unitario }
        : i))
    } else {
      const precio = productoSeleccionado.precio_venta ?? 0
      setCarrito([...carrito, {
        inventario_id: productoSeleccionado.id,
        nombre_producto: productoSeleccionado.nombre,
        cantidad: cantidadAgregar,
        precio_unitario: precio,
        subtotal: cantidadAgregar * precio,
        stock_disponible: productoSeleccionado.stock_actual,
      }])
    }
    setProductoSeleccionado(null); setBusquedaProducto(''); setCantidadAgregar(1)
  }

  function quitarDelCarrito(id: string) { setCarrito(carrito.filter(i => i.inventario_id !== id)) }
  function cambiarCantidad(id: string, nueva: number) {
    setCarrito(carrito.map(i => i.inventario_id === id ? { ...i, cantidad: nueva, subtotal: nueva * i.precio_unitario } : i))
  }
  function cambiarPrecio(id: string, nuevoPrecio: number) {
    setCarrito(carrito.map(i => i.inventario_id === id ? { ...i, precio_unitario: nuevoPrecio, subtotal: i.cantidad * nuevoPrecio } : i))
  }

  function abrirModalVenta() {
    setCarrito([]); setClienteId(''); setNombreClienteLibre(''); setMetodoPago('efectivo')
    setDescuento(0); setNotas(''); setVendedorNombre(''); setBusquedaVendedor('')
    setBusquedaProducto(''); setProductoSeleccionado(null); setCantidadAgregar(1); setErrForm(null)
    setModalVenta(true)
  }

  async function confirmarVenta() {
    if (carrito.length === 0) { setErrForm('Agrega al menos un producto'); return }
    if (!clienteId && !nombreClienteLibre.trim()) { setErrForm('Ingresa el nombre del cliente'); return }
    if (!vendedorNombre.trim()) { setErrForm('Selecciona o escribe el nombre del vendedor'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { crearVenta } = await import('@/lib/db')
      const payload = {
        cliente_id: clienteId || null,
        nombre_cliente_libre: clienteId ? null : nombreClienteLibre.trim(),
        metodo_pago: metodoPago,
        items: carrito,
        subtotal: subtotalCarrito,
        descuento,
        total: totalCarrito,
        notas: notas.trim() || null,
        vendedor_nombre: vendedorNombre.trim(),
      }
      const nueva = await crearVenta(payload)
      setModalVenta(false)
      await cargarTodo()
      setVentaComprobante(nueva as Venta)
    } catch (e: unknown) {
      setErrForm(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!ventaEliminar) return
    try {
      const { eliminarVenta } = await import('@/lib/db')
      await eliminarVenta(ventaEliminar.id)
      setVentaEliminar(null); await cargarTodo()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  const ventasFiltradas = ventas.filter(v => {
    const q = busqueda.toLowerCase()
    const nombre = v.clientes?.nombre_completo ?? v.nombre_cliente_libre ?? ''
    return !q || nombre.toLowerCase().includes(q) || String(v.numero_venta).includes(q) ||
      v.metodo_pago.includes(q) || (v.vendedor_nombre?.toLowerCase().includes(q) ?? false)
  })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@media print { body * { visibility:hidden!important } #comprobante-print,#comprobante-print *{visibility:visible!important} #comprobante-print{position:fixed!important;top:0;left:0;width:80mm} }`}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/dashboard" className="hover:text-blue-600">Dashboard</a><span>›</span>
                <span className="text-gray-700 font-medium">Ventas</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Ventas de Accesorios</h1>
              <p className="text-sm text-gray-500 mt-0.5">Venta directa sin ticket de servicio</p>
            </div>
            <button onClick={abrirModalVenta} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva venta
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ventas hoy', value: ventasHoy.length, sub: formatCurrency(totalHoy), color: 'blue' },
              { label: 'Ingresos hoy', value: formatCurrency(totalHoy), sub: `${ventasHoy.length} transacciones`, color: 'green' },
              { label: 'Ventas este mes', value: ventasMes.length, sub: formatCurrency(totalMes), color: 'purple' },
              { label: 'Total histórico', value: ventas.length, sub: formatCurrency(ventas.reduce((a,v)=>a+v.total,0)), color: 'gray' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color === 'blue' ? 'text-blue-600' : m.color === 'green' ? 'text-green-600' : m.color === 'purple' ? 'text-purple-600' : 'text-gray-700'}`}>{m.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Buscador */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Buscar por cliente, N° venta, vendedor, método de pago..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
          {loading && <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

          {/* Historial */}
          {!loading && !error && (
            <>
              <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                {ventasFiltradas.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="text-gray-500 font-medium">{ventas.length === 0 ? 'No hay ventas aún' : 'Sin resultados'}</p>
                    <p className="text-sm text-gray-400 mt-1">{ventas.length === 0 ? 'Haz clic en "Nueva venta"' : 'Prueba con otros términos'}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['N°','Cliente','Productos','Vendedor','Pago','Total','Fecha',''].map(h => (
                          <th key={h} className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 ${h === 'Total' || h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventasFiltradas.map(venta => (
                        <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3"><span className="text-sm font-bold text-gray-700">#{venta.numero_venta}</span></td>
                          <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{venta.clientes?.nombre_completo ?? venta.nombre_cliente_libre ?? 'Sin nombre'}</p></td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{Array.isArray(venta.items) ? venta.items.length : 0} producto{(Array.isArray(venta.items) ? venta.items.length : 0) !== 1 ? 's' : ''}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{Array.isArray(venta.items) ? venta.items.map((i: ItemCarrito) => i.nombre_producto).join(', ') : ''}</p>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-600">{venta.vendedor_nombre ?? '—'}</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-600">{METODO_LABEL[venta.metodo_pago]}</span></td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(venta.total)}</span>
                            {venta.descuento > 0 && <p className="text-xs text-green-600">-{formatCurrency(venta.descuento)}</p>}
                          </td>
                          <td className="px-4 py-3"><span className="text-xs text-gray-500">{formatFecha(venta.created_at)}</span></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setVentaComprobante(venta)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver comprobante">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                              <button onClick={() => setVentaEliminar(venta)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {ventasFiltradas.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 py-12 text-center"><div className="text-4xl mb-2">🛒</div><p className="text-gray-500 text-sm">No hay ventas</p></div>
                ) : ventasFiltradas.map(venta => (
                  <div key={venta.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-bold text-gray-400">#{venta.numero_venta}</span>
                        <p className="font-semibold text-gray-900">{venta.clientes?.nombre_completo ?? venta.nombre_cliente_libre ?? 'Sin nombre'}</p>
                        {venta.vendedor_nombre && <p className="text-xs text-gray-400">Vendedor: {venta.vendedor_nombre}</p>}
                      </div>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(venta.total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <span>{METODO_LABEL[venta.metodo_pago]}</span><span>·</span><span>{formatFecha(venta.created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setVentaComprobante(venta)} className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg font-medium transition-colors">Ver comprobante</button>
                      <button onClick={() => setVentaEliminar(venta)} className="flex-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg font-medium transition-colors">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODAL NUEVA VENTA ──────────────────────────────────────────────── */}
      {modalVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalVenta(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Nueva venta</h2>
                <button onClick={() => !guardando && setModalVenta(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-5">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                {/* Cliente */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cliente</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar cliente registrado</label>
                      <select value={clienteId} onChange={e => { setClienteId(e.target.value); if (e.target.value) setNombreClienteLibre('') }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">— Cliente ocasional —</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">O nombre libre {!clienteId && <span className="text-red-500">*</span>}</label>
                      <input type="text" value={nombreClienteLibre} onChange={e => { setNombreClienteLibre(e.target.value); if (e.target.value) setClienteId('') }} disabled={!!clienteId} placeholder="Nombre del cliente..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Vendedor con buscador */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vendedor <span className="text-red-500">*</span></h3>
                  <div ref={vendedorRef} className="relative">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text"
                        placeholder="Buscar vendedor por nombre..."
                        value={busquedaVendedor}
                        onChange={e => { setBusquedaVendedor(e.target.value); setVendedorNombre(e.target.value); setMostrarDropdownVendedor(true) }}
                        onFocus={() => setMostrarDropdownVendedor(true)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {vendedorNombre && (
                        <button onClick={() => { setVendedorNombre(''); setBusquedaVendedor(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>

                    {/* Dropdown */}
                    {mostrarDropdownVendedor && personalFiltrado.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        {personalFiltrado.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setVendedorNombre(p.nombre_completo); setBusquedaVendedor(p.nombre_completo); setMostrarDropdownVendedor(false) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${p.rol === 'administrador' ? 'bg-purple-600' : p.rol === 'tecnico' ? 'bg-blue-600' : 'bg-green-600'}`}>
                              {p.nombre_completo.split(' ').slice(0,2).map((n:string) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{p.nombre_completo}</p>
                              <p className="text-xs text-gray-400 capitalize">{p.rol}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {vendedorNombre && !mostrarDropdownVendedor && (
                      <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm text-blue-700 font-medium">{vendedorNombre}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Productos</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input type="text" placeholder="Buscar producto por nombre o código..." value={busquedaProducto} onChange={e => { setBusquedaProducto(e.target.value); setProductoSeleccionado(null) }} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    {busquedaProducto && !productoSeleccionado && (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {productosFiltrados.length === 0 ? <p className="text-sm text-gray-400 p-3 text-center">Sin resultados</p> :
                          productosFiltrados.map(p => (
                            <button key={p.id} onClick={() => { setProductoSeleccionado(p); setBusquedaProducto(p.nombre) }} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                                <p className="text-xs text-gray-400">{p.codigo ? `#${p.codigo} · ` : ''}{p.stock_actual} en stock</p>
                              </div>
                              <span className="text-sm font-bold text-blue-600 ml-3">{formatCurrency(p.precio_venta ?? 0)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {productoSeleccionado && (
                      <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{productoSeleccionado.nombre}</p>
                          <p className="text-xs text-gray-400">Stock: {productoSeleccionado.stock_actual}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Cant.</label>
                          <input type="number" min={1} max={productoSeleccionado.stock_actual} value={cantidadAgregar} onChange={e => setCantidadAgregar(Math.max(1, Number(e.target.value)))} className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={agregarAlCarrito} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">Agregar</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {carrito.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {carrito.map(item => (
                        <div key={item.inventario_id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.nombre_producto}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input type="number" min={1} max={item.stock_disponible} value={item.cantidad} onChange={e => cambiarCantidad(item.inventario_id, Math.max(1, Number(e.target.value)))} className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="text-gray-400 text-xs">×</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                              <input type="number" min={0} step={0.01} value={item.precio_unitario} onChange={e => cambiarPrecio(item.inventario_id, Number(e.target.value))} className="w-20 border border-gray-200 rounded-lg pl-6 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 w-16 text-right">{formatCurrency(item.subtotal)}</span>
                            <button onClick={() => quitarDelCarrito(item.inventario_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pago */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pago</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                    {(Object.keys(METODO_LABEL) as MetodoPago[]).map(m => (
                      <button key={m} onClick={() => setMetodoPago(m)} className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors text-center ${metodoPago === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {METODO_LABEL[m]}
                      </button>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span className="font-medium">{formatCurrency(subtotalCarrito)}</span></div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Descuento (S/)</span>
                      <input type="number" min={0} step={0.5} value={descuento} onChange={e => setDescuento(Math.max(0, Number(e.target.value)))} className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                      <span>TOTAL</span><span className="text-green-600 text-lg">{formatCurrency(totalCarrito)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalVenta(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={confirmarVenta} disabled={guardando || carrito.length === 0} className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Registrando...' : `Confirmar · ${formatCurrency(totalCarrito)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPROBANTE ────────────────────────────────────────────────────── */}
      {ventaComprobante && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVentaComprobante(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900">Comprobante de venta</h2>
                <button onClick={() => setVentaComprobante(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div id="comprobante-print" ref={comprobanteRef} className="px-5 py-4">
                <div className="text-center mb-4 pb-3 border-b border-dashed border-gray-300">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <p className="font-bold text-gray-900 text-base">Servicio Técnico Oxapampa</p>
                  <p className="text-xs text-gray-500">Oxapampa, Pasco — Perú</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tel: +51 963 626 744</p>
                </div>
                <div className="mb-3 pb-3 border-b border-dashed border-gray-200 space-y-1">
                  {[
                    ['N° Venta', `#${ventaComprobante.numero_venta}`],
                    ['Fecha', formatFecha(ventaComprobante.created_at)],
                    ['Cliente', ventaComprobante.clientes?.nombre_completo ?? ventaComprobante.nombre_cliente_libre ?? 'Sin nombre'],
                    ...(ventaComprobante.vendedor_nombre ? [['Vendedor', ventaComprobante.vendedor_nombre]] : []),
                    ['Pago', METODO_LABEL[ventaComprobante.metodo_pago]],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs"><span className="text-gray-500">{k}</span><span className="text-gray-700 text-right max-w-[55%]">{v}</span></div>
                  ))}
                </div>
                <div className="mb-3 pb-3 border-b border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detalle</p>
                  <div className="space-y-2">
                    {Array.isArray(ventaComprobante.items) && ventaComprobante.items.map((item: ItemCarrito, i: number) => (
                      <div key={i} className="flex justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{item.nombre_producto}</p>
                          <p className="text-xs text-gray-400">{item.cantidad} × {formatCurrency(item.precio_unitario)}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{formatCurrency(ventaComprobante.subtotal)}</span></div>
                  {ventaComprobante.descuento > 0 && <div className="flex justify-between text-xs text-green-600"><span>Descuento</span><span>-{formatCurrency(ventaComprobante.descuento)}</span></div>}
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2"><span>TOTAL</span><span>{formatCurrency(ventaComprobante.total)}</span></div>
                </div>
                {ventaComprobante.notas && <p className="text-xs text-gray-400 italic mb-3">Nota: {ventaComprobante.notas}</p>}
                <div className="text-center pt-3 border-t border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 font-medium">¡Gracias por su compra!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Conserve este comprobante</p>
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
                <button onClick={() => setVentaComprobante(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cerrar</button>
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ELIMINAR ───────────────────────────────────────────────────────── */}
      {ventaEliminar && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVentaEliminar(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar venta</h3>
              <p className="text-sm text-gray-600 mb-1">¿Eliminar la venta <strong>#{ventaEliminar.numero_venta}</strong>?</p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">⚠️ El stock descontado no se revertirá automáticamente.</p>
              <div className="flex gap-3">
                <button onClick={() => setVentaEliminar(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarEliminar} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
