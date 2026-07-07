'use client'

import { useState, useEffect } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type TipoServicio = {
  id: string
  nombre: string
  precio_base: number | null
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

type TipoServicioPayload = {
  nombre: string
  precio_base: number | null
  descripcion: string | null
  activo: boolean
}

// ── Componente principal ───────────────────────────────────────────────────
export default function TiposServicioPage() {
  const [tipos, setTipos] = useState<TipoServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [tipoEditando, setTipoEditando] = useState<TipoServicio | null>(null)
  const [modalEliminar, setModalEliminar] = useState<TipoServicio | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)

  const formVacio: TipoServicioPayload = {
    nombre: '', precio_base: null, descripcion: '', activo: true,
  }
  const [form, setForm] = useState<TipoServicioPayload>(formVacio)

  // ── Carga ────────────────────────────────────────────────────────────────
  async function cargarTipos() {
    try {
      setLoading(true); setError(null)
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase
        .from('tipos_servicio')
        .select('*')
        .order('nombre', { ascending: true })
      if (error) throw error
      setTipos(data as TipoServicio[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarTipos() }, [])

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const tiposFiltrados = tipos.filter(t => {
    const q = busqueda.toLowerCase()
    const coincide = !q ||
      t.nombre.toLowerCase().includes(q) ||
      (t.descripcion?.toLowerCase().includes(q) ?? false)
    const coincideActivo = mostrarInactivos ? true : t.activo
    return coincide && coincideActivo
  })

  const activos = tipos.filter(t => t.activo).length
  const inactivos = tipos.filter(t => !t.activo).length
  const precioPromedio = tipos.filter(t => t.precio_base).reduce((a, t, _, arr) =>
    a + (t.precio_base! / arr.filter(x => x.precio_base).length), 0)

  // ── Handlers ─────────────────────────────────────────────────────────────
  function abrirCrear() {
    setTipoEditando(null); setForm(formVacio); setErrForm(null); setModalAbierto(true)
  }

  function abrirEditar(t: TipoServicio) {
    setTipoEditando(t)
    setForm({ nombre: t.nombre, precio_base: t.precio_base, descripcion: t.descripcion ?? '', activo: t.activo })
    setErrForm(null); setModalAbierto(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErrForm('El nombre es obligatorio'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const payload = {
        nombre: form.nombre.trim(),
        precio_base: form.precio_base,
        descripcion: form.descripcion?.trim() || null,
        activo: form.activo,
        updated_at: new Date().toISOString(),
      }
      if (tipoEditando) {
        const { error } = await supabase.from('tipos_servicio').update(payload).eq('id', tipoEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tipos_servicio').insert([payload])
        if (error) throw error
      }
      setModalAbierto(false); await cargarTipos()
    } catch (e: unknown) {
      setErrForm(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(tipo: TipoServicio) {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('tipos_servicio')
        .update({ activo: !tipo.activo, updated_at: new Date().toISOString() })
        .eq('id', tipo.id)
      if (error) throw error
      await cargarTipos()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  async function confirmarEliminar() {
    if (!modalEliminar) return
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.from('tipos_servicio').delete().eq('id', modalEliminar.id)
      if (error) throw error
      setModalEliminar(null); await cargarTipos()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/dashboard" className="hover:text-blue-600">Dashboard</a>
              <span>›</span>
              <span className="text-gray-700 font-medium">Tipos de Servicio</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Servicio</h1>
            <p className="text-sm text-gray-500 mt-0.5">Catálogo de servicios ofrecidos y sus precios base</p>
          </div>
          <button
            onClick={abrirCrear}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo servicio
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">🔧 Servicios activos</p>
            <p className="text-2xl font-bold text-blue-700">{activos}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">⏸️ Inactivos</p>
            <p className="text-2xl font-bold text-gray-500">{inactivos}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">💰 Precio promedio</p>
            <p className="text-2xl font-bold text-green-700">S/ {precioPromedio.toFixed(0)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setMostrarInactivos(!mostrarInactivos)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${mostrarInactivos ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
          </button>
        </div>

        {/* Error / Loading */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Lista de servicios */}
        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {tiposFiltrados.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-3">🔧</div>
                <p className="text-gray-500 font-medium">{tipos.length === 0 ? 'No hay servicios registrados' : 'Sin resultados'}</p>
                <p className="text-sm text-gray-400 mt-1">{tipos.length === 0 ? 'Agrega tu primer tipo de servicio' : 'Prueba con otros términos'}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Servicio</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Descripción</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Precio base</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 pr-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tiposFiltrados.map(tipo => (
                    <tr key={tipo.id} className={`hover:bg-gray-50 transition-colors ${!tipo.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{tipo.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-500 truncate max-w-xs">{tipo.descripcion ?? <span className="text-gray-300 italic">Sin descripción</span>}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tipo.precio_base != null
                          ? <span className="text-sm font-bold text-green-600">S/ {tipo.precio_base.toFixed(2)}</span>
                          : <span className="text-sm text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActivo(tipo)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${tipo.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tipo.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEditar(tipo)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setModalEliminar(tipo)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">¿Cómo funciona el precio base?</p>
              <p className="text-sm text-blue-700 mt-0.5">El precio base es una referencia inicial. Al crear un ticket puedes ajustar el precio final según la complejidad del trabajo. Los servicios inactivos no aparecen al crear tickets.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL CREAR / EDITAR ───────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalAbierto(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {tipoEditando ? 'Editar servicio' : 'Nuevo tipo de servicio'}
                </h2>
                <button onClick={() => !guardando && setModalAbierto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {errForm && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del servicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Descarga de música, Instalación de GPS..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio base (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                    <input
                      type="number"
                      min={0}
                      step={0.50}
                      value={form.precio_base ?? ''}
                      onChange={e => setForm({ ...form, precio_base: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Opcional — referencia para cotizar al cliente</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={form.descripcion ?? ''}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Describe en qué consiste este servicio..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Servicio activo</p>
                    <p className="text-xs text-gray-400">Los inactivos no aparecen al crear tickets</p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, activo: !form.activo })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button onClick={() => !guardando && setModalAbierto(false)} disabled={guardando} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : tipoEditando ? 'Guardar cambios' : 'Crear servicio'}
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
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar servicio</h3>
              <p className="text-sm text-gray-600 mb-2">¿Eliminar <strong>{modalEliminar.nombre}</strong>?</p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
                ⚠️ Si hay tickets que usan este servicio, considera desactivarlo en vez de eliminarlo.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModalEliminar(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarEliminar} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
