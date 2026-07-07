'use client'

import { useState, useEffect, useRef } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type CategoriaInventario = 'accesorio' | 'repuesto' | 'herramienta' | 'consumible' | 'otro'
type UnidadMedida = 'unidad' | 'par' | 'kit' | 'metro' | 'litro' | 'gramo' | 'caja'

type ItemInventario = {
  id: string
  codigo: string | null
  nombre: string
  descripcion: string | null
  categoria: CategoriaInventario
  unidad_medida: UnidadMedida
  stock_actual: number
  stock_minimo: number
  stock_maximo: number | null
  precio_costo: number | null
  precio_venta: number | null
  marca: string | null
  modelo: string | null
  ubicacion: string | null
  proveedor: string | null
  notas: string | null
  foto_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

type ItemPayload = Partial<Omit<ItemInventario, 'id' | 'created_at' | 'updated_at'>> & {
  nombre: string
  categoria: CategoriaInventario
  unidad_medida: UnidadMedida
  stock_actual: number
  stock_minimo: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
function estadoStock(item: ItemInventario): 'critico' | 'bajo' | 'ok' | 'exceso' {
  if (item.stock_actual === 0) return 'critico'
  if (item.stock_actual <= item.stock_minimo) return 'bajo'
  if (item.stock_maximo && item.stock_actual >= item.stock_maximo) return 'exceso'
  return 'ok'
}

const COLORES_ESTADO: Record<string, string> = {
  critico: 'bg-red-100 text-red-700 border border-red-200',
  bajo:    'bg-amber-100 text-amber-700 border border-amber-200',
  ok:      'bg-green-100 text-green-700 border border-green-200',
  exceso:  'bg-blue-100 text-blue-700 border border-blue-200',
}
const LABEL_ESTADO: Record<string, string> = {
  critico: 'Sin stock', bajo: 'Stock bajo', ok: 'Normal', exceso: 'Exceso',
}
const COLORES_CATEGORIA: Record<CategoriaInventario, string> = {
  accesorio:   'bg-purple-100 text-purple-700',
  repuesto:    'bg-orange-100 text-orange-700',
  herramienta: 'bg-cyan-100 text-cyan-700',
  consumible:  'bg-pink-100 text-pink-700',
  otro:        'bg-gray-100 text-gray-600',
}
const LABEL_CATEGORIA: Record<CategoriaInventario, string> = {
  accesorio: 'Accesorio', repuesto: 'Repuesto',
  herramienta: 'Herramienta', consumible: 'Consumible', otro: 'Otro',
}

function formatCurrency(val: number | null | undefined) {
  if (val == null) return '—'
  return `S/ ${val.toFixed(2)}`
}

// ── Componente principal ───────────────────────────────────────────────────
export default function InventarioPage() {
  const [items, setItems] = useState<ItemInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<'tabla' | 'grid'>('grid')

  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | CategoriaInventario>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'critico' | 'bajo' | 'ok' | 'exceso'>('todos')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalStockAbierto, setModalStockAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState<ItemInventario | null>(null)
  const [itemEditando, setItemEditando] = useState<ItemInventario | null>(null)
  const [itemStock, setItemStock] = useState<ItemInventario | null>(null)

  const formVacio: ItemPayload = {
    nombre: '', codigo: '', descripcion: '', categoria: 'accesorio',
    unidad_medida: 'unidad', stock_actual: 0, stock_minimo: 0, stock_maximo: null,
    precio_costo: null, precio_venta: null, marca: '', modelo: '',
    ubicacion: '', proveedor: '', notas: '', foto_url: null, activo: true,
  }
  const [form, setForm] = useState<ItemPayload>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)

  // Foto
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Stock
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'salida' | 'ajuste'>('entrada')
  const [cantidadAjuste, setCantidadAjuste] = useState(1)
  const [ajustando, setAjustando] = useState(false)

  async function cargarItems() {
    try {
      setLoading(true); setError(null)
      const { obtenerInventario } = await import('@/lib/db')
      const data = await obtenerInventario()
      setItems(data as ItemInventario[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarItems() }, [])

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const itemsFiltrados = items.filter(item => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q ||
      item.nombre.toLowerCase().includes(q) ||
      (item.codigo?.toLowerCase().includes(q) ?? false) ||
      (item.marca?.toLowerCase().includes(q) ?? false) ||
      (item.proveedor?.toLowerCase().includes(q) ?? false) ||
      (item.ubicacion?.toLowerCase().includes(q) ?? false)
    const coincideCategoria = filtroCategoria === 'todos' || item.categoria === filtroCategoria
    const coincideEstado = filtroEstado === 'todos' || estadoStock(item) === filtroEstado
    return coincideBusqueda && coincideCategoria && coincideEstado
  })

  const sinStock    = items.filter(i => estadoStock(i) === 'critico').length
  const stockBajo   = items.filter(i => estadoStock(i) === 'bajo').length
  const valorInv    = items.reduce((a, i) => a + (i.stock_actual * (i.precio_costo ?? 0)), 0)

  // ── Foto handlers ─────────────────────────────────────────────────────────
  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setErrForm('La foto no debe superar 3MB'); return }
    setFotoArchivo(file)
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function quitarFoto() {
    setFotoArchivo(null)
    setFotoPreview(null)
    setForm(f => ({ ...f, foto_url: null }))
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function subirFotoAStorage(archivo: File): Promise<string> {
    const { supabase } = await import('@/lib/supabase')
    const ext = archivo.name.split('.').pop()
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('inventario-fotos').upload(nombre, archivo, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('inventario-fotos').getPublicUrl(nombre)
    return data.publicUrl
  }

  // ── Handlers formulario ──────────────────────────────────────────────────
  function abrirCrear() {
    setItemEditando(null); setForm(formVacio); setErrForm(null)
    setFotoPreview(null); setFotoArchivo(null); setModalAbierto(true)
  }

  function abrirEditar(item: ItemInventario) {
    setItemEditando(item)
    setForm({
      nombre: item.nombre, codigo: item.codigo ?? '', descripcion: item.descripcion ?? '',
      categoria: item.categoria, unidad_medida: item.unidad_medida,
      stock_actual: item.stock_actual, stock_minimo: item.stock_minimo,
      stock_maximo: item.stock_maximo, precio_costo: item.precio_costo,
      precio_venta: item.precio_venta, marca: item.marca ?? '',
      modelo: item.modelo ?? '', ubicacion: item.ubicacion ?? '',
      proveedor: item.proveedor ?? '', notas: item.notas ?? '',
      foto_url: item.foto_url, activo: item.activo,
    })
    setFotoPreview(item.foto_url)
    setFotoArchivo(null); setErrForm(null); setModalAbierto(true)
  }

  function abrirAjusteStock(item: ItemInventario) {
    setItemStock(item); setTipoAjuste('entrada'); setCantidadAjuste(1); setModalStockAbierto(true)
  }

  async function guardarItem() {
    if (!form.nombre?.trim()) { setErrForm('El nombre es obligatorio'); return }
    setGuardando(true); setErrForm(null)
    try {
      let fotoUrl = form.foto_url ?? null

      // Subir foto si hay una nueva
      if (fotoArchivo) {
        setSubiendoFoto(true)
        try { fotoUrl = await subirFotoAStorage(fotoArchivo) }
        finally { setSubiendoFoto(false) }
      }

      const { crearItemInventario, actualizarItemInventario } = await import('@/lib/db')
      const payload = {
        ...form,
        foto_url: fotoUrl,
        codigo: form.codigo || null, descripcion: form.descripcion || null,
        marca: form.marca || null, modelo: form.modelo || null,
        ubicacion: form.ubicacion || null, proveedor: form.proveedor || null,
        notas: form.notas || null,
      }
      if (itemEditando) {
        await actualizarItemInventario(itemEditando.id, payload)
      } else {
        await crearItemInventario(payload)
      }
      setModalAbierto(false); await cargarItems()
    } catch (e: unknown) {
      setErrForm(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!modalEliminar) return
    try {
      const { eliminarItemInventario } = await import('@/lib/db')
      await eliminarItemInventario(modalEliminar.id)
      setModalEliminar(null); await cargarItems()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  async function confirmarAjusteStock() {
    if (!itemStock) return
    setAjustando(true)
    try {
      const { ajustarStock } = await import('@/lib/db')
      await ajustarStock(itemStock.id, cantidadAjuste, tipoAjuste)
      setModalStockAbierto(false); await cargarItems()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setAjustando(false) }
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
              <span className="text-gray-700 font-medium">Inventario</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500 mt-0.5">Accesorios, repuestos y herramientas</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button onClick={() => setVista('grid')} className={`p-1.5 rounded-md transition-colors ${vista === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="Vista cuadrícula">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button onClick={() => setVista('tabla')} className={`p-1.5 rounded-md transition-colors ${vista === 'tabla' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="Vista tabla">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
            </div>
            <button onClick={abrirCrear} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Agregar producto
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Alerta stock */}
        {(sinStock > 0 || stockBajo > 0) && (
          <div className={`rounded-lg p-4 border ${sinStock > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{sinStock > 0 ? '🚨' : '⚠️'}</span>
              <div>
                <p className={`text-sm font-semibold ${sinStock > 0 ? 'text-red-800' : 'text-amber-800'}`}>Alerta de stock</p>
                <p className={`text-sm ${sinStock > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {sinStock > 0 && `${sinStock} producto${sinStock > 1 ? 's' : ''} sin stock. `}
                  {stockBajo > 0 && `${stockBajo} producto${stockBajo > 1 ? 's' : ''} con stock bajo. `}
                  <button onClick={() => setFiltroEstado(sinStock > 0 ? 'critico' : 'bajo')} className="underline font-medium">Ver afectados</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-xs text-gray-500 font-medium mb-1">📦 Total productos</p><p className="text-2xl font-bold text-blue-700">{items.length}</p></div>
          <div className={`rounded-xl p-4 border ${sinStock > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}><p className="text-xs text-gray-500 font-medium mb-1">🚫 Sin stock</p><p className={`text-2xl font-bold ${sinStock > 0 ? 'text-red-700' : 'text-gray-700'}`}>{sinStock}</p></div>
          <div className={`rounded-xl p-4 border ${stockBajo > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}><p className="text-xs text-gray-500 font-medium mb-1">⚠️ Stock bajo</p><p className={`text-2xl font-bold ${stockBajo > 0 ? 'text-amber-700' : 'text-gray-700'}`}>{stockBajo}</p></div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4"><p className="text-xs text-gray-500 font-medium mb-1">💰 Valor inventario</p><p className="text-2xl font-bold text-green-700">S/ {valorInv.toFixed(0)}</p></div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Buscar por nombre, código, marca, proveedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as typeof filtroCategoria)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="todos">Todas las categorías</option>
              <option value="accesorio">Accesorio</option>
              <option value="repuesto">Repuesto</option>
              <option value="herramienta">Herramienta</option>
              <option value="consumible">Consumible</option>
              <option value="otro">Otro</option>
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="todos">Todos los estados</option>
              <option value="critico">Sin stock</option>
              <option value="bajo">Stock bajo</option>
              <option value="ok">Normal</option>
              <option value="exceso">Exceso</option>
            </select>
            {(busqueda || filtroCategoria !== 'todos' || filtroEstado !== 'todos') && (
              <button onClick={() => { setBusqueda(''); setFiltroCategoria('todos'); setFiltroEstado('todos') }} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap">Limpiar</button>
            )}
          </div>
          {itemsFiltrados.length !== items.length && (
            <p className="text-xs text-gray-400 mt-2">Mostrando {itemsFiltrados.length} de {items.length} productos</p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
        {loading && <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && !error && (
          <>
            {itemsFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <div className="text-5xl mb-3">📦</div>
                <p className="text-gray-500 font-medium">{items.length === 0 ? 'No hay productos en inventario' : 'No hay resultados'}</p>
                <p className="text-sm text-gray-400 mt-1">{items.length === 0 ? 'Agrega tu primer producto' : 'Prueba con otros filtros'}</p>
              </div>
            ) : vista === 'grid' ? (
              /* ── VISTA GRID ── */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {itemsFiltrados.map(item => {
                  const estado = estadoStock(item)
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                      {/* Foto */}
                      <div className="relative aspect-square bg-gray-50 overflow-hidden">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl mb-1">
                                {item.categoria === 'accesorio' ? '🔌' : item.categoria === 'repuesto' ? '⚙️' : item.categoria === 'herramienta' ? '🔧' : item.categoria === 'consumible' ? '🧴' : '📦'}
                              </div>
                              <p className="text-xs text-gray-300">Sin foto</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COLORES_ESTADO[estado]}`}>{LABEL_ESTADO[estado]}</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.nombre}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COLORES_CATEGORIA[item.categoria]}`}>{LABEL_CATEGORIA[item.categoria]}</span>
                          <span className="text-xs font-bold text-gray-700">{item.stock_actual} uds</span>
                        </div>
                        {item.precio_venta && (
                          <p className="text-sm font-bold text-blue-600 mt-1">{formatCurrency(item.precio_venta)}</p>
                        )}
                        {item.marca && <p className="text-xs text-gray-400 truncate mt-0.5">{item.marca}</p>}
                        {/* Acciones */}
                        <div className="flex gap-1.5 mt-3">
                          <button onClick={() => abrirAjusteStock(item)} className="flex-1 text-xs text-green-600 bg-green-50 hover:bg-green-100 py-1.5 rounded-lg font-medium transition-colors" title="Ajustar stock">Stock</button>
                          <button onClick={() => abrirEditar(item)} className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg font-medium transition-colors">Editar</button>
                          <button onClick={() => setModalEliminar(item)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── VISTA TABLA ── */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Producto</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Categoría</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Stock</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Costo</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Venta</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 pr-5">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsFiltrados.map(item => {
                      const estado = estadoStock(item)
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {item.foto_url ? (
                                  <img src={item.foto_url} alt={item.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-lg">
                                    {item.categoria === 'accesorio' ? '🔌' : item.categoria === 'repuesto' ? '⚙️' : item.categoria === 'herramienta' ? '🔧' : item.categoria === 'consumible' ? '🧴' : '📦'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{item.nombre}</p>
                                <p className="text-xs text-gray-400">{item.codigo ? `#${item.codigo}` : ''}{item.marca ? ` · ${item.marca}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORES_CATEGORIA[item.categoria]}`}>{LABEL_CATEGORIA[item.categoria]}</span></td>
                          <td className="px-4 py-3 text-center"><div className="text-sm font-bold text-gray-900">{item.stock_actual}</div><div className="text-xs text-gray-400">{item.unidad_medida}</div></td>
                          <td className="px-4 py-3 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORES_ESTADO[estado]}`}>{LABEL_ESTADO[estado]}</span></td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(item.precio_costo)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.precio_venta)}</td>
                          <td className="px-4 py-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirAjusteStock(item)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ajustar stock">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                              </button>
                              <button onClick={() => abrirEditar(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => setModalEliminar(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL CREAR/EDITAR ─────────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalAbierto(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{itemEditando ? 'Editar producto' : 'Nuevo producto'}</h2>
                <button onClick={() => !guardando && setModalAbierto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                {/* FOTO */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Foto del producto</h3>
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <div className="text-3xl mb-1">📷</div>
                          <p className="text-xs text-gray-300">Sin foto</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFotoChange} className="hidden" id="foto-input" />
                      <label htmlFor="foto-input" className="inline-flex items-center gap-2 cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
                      </label>
                      {fotoPreview && (
                        <button onClick={quitarFoto} className="block text-xs text-red-500 hover:text-red-700 transition-colors">Quitar foto</button>
                      )}
                      <p className="text-xs text-gray-400">JPG, PNG o WebP. Máximo 3MB.</p>
                      {fotoArchivo && <p className="text-xs text-blue-600 font-medium">✓ {fotoArchivo.name}</p>}
                    </div>
                  </div>
                </div>

                {/* Info básica */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Información básica</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                      <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cable HDMI 1.8m" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código / SKU</label>
                      <input type="text" value={form.codigo ?? ''} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ej: HDMI-001" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                      <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaInventario })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="accesorio">Accesorio</option>
                        <option value="repuesto">Repuesto</option>
                        <option value="herramienta">Herramienta</option>
                        <option value="consumible">Consumible</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                      <input type="text" value={form.marca ?? ''} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Logitech" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                      <input type="text" value={form.modelo ?? ''} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: K120" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea value={form.descripcion ?? ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del producto..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stock</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock actual <span className="text-red-500">*</span></label><input type="number" min={0} value={form.stock_actual} onChange={e => setForm({ ...form, stock_actual: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo <span className="text-red-500">*</span></label><input type="number" min={0} value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock máximo</label><input type="number" min={0} value={form.stock_maximo ?? ''} onChange={e => setForm({ ...form, stock_maximo: e.target.value ? Number(e.target.value) : null })} placeholder="Opcional" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label><select value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value as UnidadMedida })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="unidad">Unidad</option><option value="par">Par</option><option value="kit">Kit</option><option value="metro">Metro</option><option value="litro">Litro</option><option value="gramo">Gramo</option><option value="caja">Caja</option></select></div>
                  </div>
                </div>

                {/* Precios */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Precios (S/)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label><input type="number" min={0} step={0.01} value={form.precio_costo ?? ''} onChange={e => setForm({ ...form, precio_costo: e.target.value ? Number(e.target.value) : null })} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label><input type="number" min={0} step={0.01} value={form.precio_venta ?? ''} onChange={e => setForm({ ...form, precio_venta: e.target.value ? Number(e.target.value) : null })} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    {form.precio_costo && form.precio_venta && Number(form.precio_venta) > Number(form.precio_costo) && (
                      <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                        Margen: S/ {(Number(form.precio_venta) - Number(form.precio_costo)).toFixed(2)} ({(((Number(form.precio_venta) - Number(form.precio_costo)) / Number(form.precio_costo)) * 100).toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* Logística */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Logística</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label><input type="text" value={form.ubicacion ?? ''} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej: Estante A-1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label><input type="text" value={form.proveedor ?? ''} onChange={e => setForm({ ...form, proveedor: e.target.value })} placeholder="Nombre del proveedor" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label><textarea value={form.notas ?? ''} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Notas internas..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalAbierto(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardarItem} disabled={guardando} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {(guardando || subiendoFoto) && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {subiendoFoto ? 'Subiendo foto...' : guardando ? 'Guardando...' : itemEditando ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJUSTE STOCK ─────────────────────────────────────────────── */}
      {modalStockAbierto && itemStock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !ajustando && setModalStockAbierto(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Ajustar stock</h2>
                <button onClick={() => !ajustando && setModalStockAbierto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  {itemStock.foto_url ? (
                    <img src={itemStock.foto_url} alt={itemStock.nombre} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">📦</div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{itemStock.nombre}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-center"><div className="text-xl font-bold text-gray-900">{itemStock.stock_actual}</div><div className="text-xs text-gray-400">Actual</div></div>
                      <div className="text-gray-300">→</div>
                      <div className="text-center">
                        <div className={`text-xl font-bold ${tipoAjuste === 'entrada' ? 'text-green-600' : tipoAjuste === 'salida' ? 'text-red-600' : 'text-blue-600'}`}>
                          {tipoAjuste === 'entrada' ? itemStock.stock_actual + cantidadAjuste : tipoAjuste === 'salida' ? Math.max(0, itemStock.stock_actual - cantidadAjuste) : cantidadAjuste}
                        </div>
                        <div className="text-xs text-gray-400">Nuevo</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['entrada', 'salida', 'ajuste'] as const).map(tipo => (
                      <button key={tipo} onClick={() => setTipoAjuste(tipo)} className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${tipoAjuste === tipo ? tipo === 'entrada' ? 'bg-green-600 text-white border-green-600' : tipo === 'salida' ? 'bg-red-600 text-white border-red-600' : 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                        {tipo === 'entrada' ? '↑ Entrada' : tipo === 'salida' ? '↓ Salida' : '✎ Ajuste'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{tipoAjuste === 'entrada' ? 'Suma al stock actual' : tipoAjuste === 'salida' ? 'Resta del stock actual' : 'Establece el stock exacto'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tipoAjuste === 'ajuste' ? 'Stock final' : 'Cantidad'}</label>
                  <input type="number" min={0} value={cantidadAjuste} onChange={e => setCantidadAjuste(Math.max(0, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !ajustando && setModalStockAbierto(false)} disabled={ajustando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={confirmarAjusteStock} disabled={ajustando} className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {ajustando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {ajustando ? 'Aplicando...' : 'Aplicar cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ─────────────────────────────────────────────────── */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalEliminar(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar producto</h3>
              <p className="text-sm text-gray-600 mb-6">¿Eliminar <strong>{modalEliminar.nombre}</strong>? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setModalEliminar(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarEliminar} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
