'use client'

import { useState, useEffect, useMemo } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type CategoriaInventario = 'accesorio' | 'repuesto' | 'herramienta' | 'consumible' | 'otro'

type ItemInventario = {
  id: string
  codigo: string | null
  nombre: string
  descripcion: string | null
  categoria: CategoriaInventario
  unidad_medida: string
  stock_actual: number
  precio_venta: number | null
  marca: string | null
  modelo: string | null
  foto_url: string | null
}

// ── Configuración de la tienda ───────────────────────────────────────────────
const WHATSAPP_NUMERO = '51963626744' // David Arenales Ortega
const NOMBRE_TIENDA = 'Servicio Técnico Oxapampa'

const LABEL_CATEGORIA: Record<CategoriaInventario, string> = {
  accesorio: 'Accesorios', repuesto: 'Repuestos',
  herramienta: 'Herramientas', consumible: 'Consumibles', otro: 'Otros',
}

const ICONO_CATEGORIA: Record<CategoriaInventario, string> = {
  accesorio: '🔌', repuesto: '⚙️', herramienta: '🔧', consumible: '🧴', otro: '📦',
}

function formatPrecio(v: number | null) {
  if (v == null) return 'Consultar'
  return `S/ ${v.toFixed(2)}`
}

function linkWhatsapp(producto: ItemInventario) {
  const msg = `Hola, quiero consultar sobre: *${producto.nombre}*${producto.codigo ? ` (código ${producto.codigo})` : ''}. ¿Está disponible?`
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`
}

// ── Componente principal ───────────────────────────────────────────────────
export default function CatalogoPage() {
  const [productos, setProductos] = useState<ItemInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<'todos' | CategoriaInventario>('todos')
  const [productoModal, setProductoModal] = useState<ItemInventario | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true); setError(null)
        const { obtenerInventario } = await import('@/lib/db')
        const data = await obtenerInventario()
        setProductos((data as unknown) as ItemInventario[])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar catálogo')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const categoriasDisponibles = useMemo(() => {
    const set = new Set(productos.map(p => p.categoria))
    return Array.from(set)
  }, [productos])

  const productosFiltrados = productos.filter(p => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q || p.nombre.toLowerCase().includes(q) || (p.marca?.toLowerCase().includes(q) ?? false)
    const coincideCategoria = categoria === 'todos' || p.categoria === categoria
    return coincideBusqueda && coincideCategoria
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6EFE4' }}>
      {/* Estilos de fuente */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        .font-display { font-family: 'Archivo Black', sans-serif; }
        .font-body { font-family: 'Archivo', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* ── HEADER / HERO ── */}
      <header className="relative overflow-hidden" style={{ backgroundColor: '#8C3D2E' }}>
        {/* Patrón decorativo tipo herramientas */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)`,
        }} />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14 relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-xs uppercase tracking-widest text-orange-200">Oxapampa, Pasco</span>
            <span className="w-1 h-1 rounded-full bg-orange-300" />
            <span className="font-mono text-xs uppercase tracking-widest text-orange-200">Tienda y taller</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl text-white leading-[1.05] mb-3">
            ACCESORIOS Y<br />REPUESTOS
          </h1>
          <p className="font-body text-orange-100 text-sm sm:text-base max-w-md">
            Lo que tu equipo necesita, en stock real. Consulta por WhatsApp y te confirmamos al toque.
          </p>
        </div>
        {/* Borde inferior tipo cinta métrica */}
        <div className="h-2 w-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #F2A65A 0, #F2A65A 8px, #8C3D2E 8px, #8C3D2E 16px)'
        }} />
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-6">

        {/* ── BUSCADOR Y FILTROS ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C3D2E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Busca un cable, mouse, repuesto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm font-body rounded-xl border-2 focus:outline-none transition-colors"
              style={{ borderColor: '#E4D5BE', backgroundColor: '#fff' }}
            />
          </div>
        </div>

        {/* Chips de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setCategoria('todos')}
            className={`flex-shrink-0 font-body text-sm font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${categoria === 'todos' ? 'text-white' : ''}`}
            style={categoria === 'todos' ? { backgroundColor: '#8C3D2E' } : { backgroundColor: '#fff', color: '#8C3D2E', border: '2px solid #E4D5BE' }}
          >
            Todo
          </button>
          {categoriasDisponibles.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`flex-shrink-0 font-body text-sm font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${categoria === cat ? 'text-white' : ''}`}
              style={categoria === cat ? { backgroundColor: '#8C3D2E' } : { backgroundColor: '#fff', color: '#8C3D2E', border: '2px solid #E4D5BE' }}
            >
              {ICONO_CATEGORIA[cat]} {LABEL_CATEGORIA[cat]}
            </button>
          ))}
        </div>

        {/* ── ESTADOS ── */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-sm text-red-700 font-body">{error}</div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff' }}>
                <div className="aspect-square animate-pulse" style={{ backgroundColor: '#E4D5BE' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded animate-pulse" style={{ backgroundColor: '#E4D5BE', width: '80%' }} />
                  <div className="h-3 rounded animate-pulse" style={{ backgroundColor: '#E4D5BE', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── GRID DE PRODUCTOS ── */}
        {!loading && !error && (
          productosFiltrados.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-display text-lg" style={{ color: '#8C3D2E' }}>SIN RESULTADOS</p>
              <p className="font-body text-sm mt-1" style={{ color: '#A8896E' }}>Prueba con otra búsqueda o categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {productosFiltrados.map(p => {
                const agotado = p.stock_actual === 0
                return (
                  <button
                    key={p.id}
                    onClick={() => setProductoModal(p)}
                    className="text-left rounded-2xl overflow-hidden transition-transform hover:-translate-y-1 group"
                    style={{ backgroundColor: '#fff', border: '1px solid #E4D5BE' }}
                  >
                    {/* Imagen */}
                    <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: '#F6EFE4' }}>
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nombre} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${agotado ? 'opacity-40 grayscale' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">
                          {ICONO_CATEGORIA[p.categoria]}
                        </div>
                      )}
                      {agotado && (
                        <div className="absolute top-2 left-2 font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#8C3D2E' }}>
                          Agotado
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <p className="font-body text-sm font-semibold leading-tight line-clamp-2" style={{ color: '#3D2B1F' }}>{p.nombre}</p>
                      {p.marca && <p className="font-mono text-[10px] uppercase tracking-wide mt-0.5" style={{ color: '#A8896E' }}>{p.marca}</p>}
                      <p className="font-display text-base mt-1.5" style={{ color: '#8C3D2E' }}>{formatPrecio(p.precio_venta)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-12 py-8" style={{ backgroundColor: '#3D2B1F' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 text-center">
          <p className="font-display text-white text-sm">{NOMBRE_TIENDA.toUpperCase()}</p>
          <p className="font-body text-xs mt-1" style={{ color: '#C9B59A' }}>Oxapampa, Pasco · Perú</p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 font-body text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:scale-105"
            style={{ backgroundColor: '#F2A65A', color: '#3D2B1F' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.149.297-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.149-.668-1.612-.916-2.207-.242-.579-.487-.5-.668-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.097 3.2 5.077 4.36 2.98 1.16 2.98.773 3.521.724.541-.05 1.758-.718 2.005-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.04 0C5.396 0 0 5.396 0 12.04c0 2.146.567 4.156 1.554 5.9L0 24l6.224-1.628a11.96 11.96 0 005.816 1.485h.005c6.644 0 12.04-5.396 12.04-12.04C24.085 5.173 18.69 0 12.04 0zm0 21.96a9.91 9.91 0 01-5.046-1.382l-.362-.215-3.747.98 1.001-3.652-.236-.376a9.94 9.94 0 01-1.524-5.275C2.126 6.503 6.503 2.126 12.04 2.126c5.539 0 9.916 4.377 9.916 9.914 0 5.539-4.377 9.92-9.916 9.92z"/></svg>
            Escríbenos por WhatsApp
          </a>
        </div>
      </footer>

      {/* ── BOTÓN FLOTANTE WHATSAPP (signature element) ── */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMERO}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-2xl transition-transform hover:scale-105"
        style={{ backgroundColor: '#25D366' }}
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.149.297-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.149-.668-1.612-.916-2.207-.242-.579-.487-.5-.668-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.097 3.2 5.077 4.36 2.98 1.16 2.98.773 3.521.724.541-.05 1.758-.718 2.005-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.04 0C5.396 0 0 5.396 0 12.04c0 2.146.567 4.156 1.554 5.9L0 24l6.224-1.628a11.96 11.96 0 005.816 1.485h.005c6.644 0 12.04-5.396 12.04-12.04C24.085 5.173 18.69 0 12.04 0zm0 21.96a9.91 9.91 0 01-5.046-1.382l-.362-.215-3.747.98 1.001-3.652-.236-.376a9.94 9.94 0 01-1.524-5.275C2.126 6.503 6.503 2.126 12.04 2.126c5.539 0 9.916 4.377 9.916 9.914 0 5.539-4.377 9.92-9.916 9.92z"/></svg>
        <span className="font-body text-white text-sm font-bold hidden sm:inline">Consultar</span>
      </a>

      {/* ── MODAL PRODUCTO ── */}
      {productoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProductoModal(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ backgroundColor: '#fff' }}>
              <button onClick={() => setProductoModal(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors shadow-sm">
                <svg className="w-4 h-4" style={{ color: '#3D2B1F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Imagen */}
              <div className="aspect-square relative" style={{ backgroundColor: '#F6EFE4' }}>
                {productoModal.foto_url ? (
                  <img src={productoModal.foto_url} alt={productoModal.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">
                    {ICONO_CATEGORIA[productoModal.categoria]}
                  </div>
                )}
              </div>

              <div className="p-6">
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#A8896E' }}>
                  {LABEL_CATEGORIA[productoModal.categoria]}{productoModal.marca ? ` · ${productoModal.marca}` : ''}
                </span>
                <h2 className="font-display text-xl mt-1 mb-2" style={{ color: '#3D2B1F' }}>{productoModal.nombre}</h2>
                {productoModal.descripcion && (
                  <p className="font-body text-sm mb-4" style={{ color: '#6B5645' }}>{productoModal.descripcion}</p>
                )}

                <div className="flex items-center justify-between mb-5">
                  <span className="font-display text-2xl" style={{ color: '#8C3D2E' }}>{formatPrecio(productoModal.precio_venta)}</span>
                  {productoModal.stock_actual === 0 ? (
                    <span className="font-mono text-xs uppercase tracking-wide px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#8C3D2E' }}>Agotado</span>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wide px-3 py-1 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>Disponible</span>
                  )}
                </div>

                <a
                  href={linkWhatsapp(productoModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-body font-bold text-sm text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.149.297-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.149-.668-1.612-.916-2.207-.242-.579-.487-.5-.668-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.097 3.2 5.077 4.36 2.98 1.16 2.98.773 3.521.724.541-.05 1.758-.718 2.005-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.04 0C5.396 0 0 5.396 0 12.04c0 2.146.567 4.156 1.554 5.9L0 24l6.224-1.628a11.96 11.96 0 005.816 1.485h.005c6.644 0 12.04-5.396 12.04-12.04C24.085 5.173 18.69 0 12.04 0zm0 21.96a9.91 9.91 0 01-5.046-1.382l-.362-.215-3.747.98 1.001-3.652-.236-.376a9.94 9.94 0 01-1.524-5.275C2.126 6.503 6.503 2.126 12.04 2.126c5.539 0 9.916 4.377 9.916 9.914 0 5.539-4.377 9.92-9.916 9.92z"/></svg>
                  Consultar este producto
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
