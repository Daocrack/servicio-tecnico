'use client'

import { useState, useEffect } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────
type RolPersonal = 'administrador' | 'tecnico' | 'vendedor'

type Personal = {
  id: string
  nombre_completo: string
  rol: RolPersonal
  dni: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

type PersonalPayload = Partial<Omit<Personal, 'id' | 'created_at' | 'updated_at'>> & {
  nombre_completo: string
  rol: RolPersonal
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ROL_LABEL: Record<RolPersonal, string> = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  vendedor: 'Vendedor',
}

const ROL_COLOR: Record<RolPersonal, string> = {
  administrador: 'bg-purple-100 text-purple-700 border border-purple-200',
  tecnico: 'bg-blue-100 text-blue-700 border border-blue-200',
  vendedor: 'bg-green-100 text-green-700 border border-green-200',
}

const ROL_ICON: Record<RolPersonal, string> = {
  administrador: '👑',
  tecnico: '🔧',
  vendedor: '🛒',
}

function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const AVATAR_BG: Record<RolPersonal, string> = {
  administrador: 'bg-purple-600',
  tecnico: 'bg-blue-600',
  vendedor: 'bg-green-600',
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<'todos' | RolPersonal>('todos')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [personaEditando, setPersonaEditando] = useState<Personal | null>(null)
  const [modalDesactivar, setModalDesactivar] = useState<Personal | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)

  const formVacio: PersonalPayload = {
    nombre_completo: '', rol: 'vendedor', dni: '', telefono: '', email: '', notas: '', activo: true,
  }
  const [form, setForm] = useState<PersonalPayload>(formVacio)

  // ── Carga ────────────────────────────────────────────────────────────────
  async function cargarPersonal() {
    try {
      setLoading(true); setError(null)
      const { obtenerTodoElPersonal } = await import('@/lib/db')
      const data = await obtenerTodoElPersonal()
      setPersonal(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar personal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarPersonal() }, [])

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const personalFiltrado = personal.filter(p => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q ||
      p.nombre_completo.toLowerCase().includes(q) ||
      (p.dni?.toLowerCase().includes(q) ?? false) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.telefono?.toLowerCase().includes(q) ?? false)
    const coincideRol = filtroRol === 'todos' || p.rol === filtroRol
    const coincideActivo = mostrarInactivos ? true : p.activo
    return coincideBusqueda && coincideRol && coincideActivo
  })

  // Métricas
  const activos = personal.filter(p => p.activo)
  const admins = activos.filter(p => p.rol === 'administrador').length
  const tecnicos = activos.filter(p => p.rol === 'tecnico').length
  const vendedores = activos.filter(p => p.rol === 'vendedor').length

  // ── Handlers ─────────────────────────────────────────────────────────────
  function abrirCrear() {
    setPersonaEditando(null)
    setForm(formVacio)
    setErrForm(null)
    setModalAbierto(true)
  }

  function abrirEditar(p: Personal) {
    setPersonaEditando(p)
    setForm({
      nombre_completo: p.nombre_completo,
      rol: p.rol,
      dni: p.dni ?? '',
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      notas: p.notas ?? '',
      activo: p.activo,
    })
    setErrForm(null)
    setModalAbierto(true)
  }

  async function guardar() {
    if (!form.nombre_completo?.trim()) { setErrForm('El nombre es obligatorio'); return }
    setGuardando(true); setErrForm(null)
    try {
      const { crearPersonal, actualizarPersonal } = await import('@/lib/db')
      const payload = {
        ...form,
        dni: form.dni || null,
        telefono: form.telefono || null,
        email: form.email || null,
        notas: form.notas || null,
      }
      if (personaEditando) {
        await actualizarPersonal(personaEditando.id, payload)
      } else {
        await crearPersonal(payload as PersonalPayload & { nombre_completo: string; rol: RolPersonal })
      }
      setModalAbierto(false)
      await cargarPersonal()
    } catch (e: unknown) {
      setErrForm(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarDesactivar() {
    if (!modalDesactivar) return
    try {
      const { desactivarPersonal, actualizarPersonal } = await import('@/lib/db')
      if (modalDesactivar.activo) {
        await desactivarPersonal(modalDesactivar.id)
      } else {
        await actualizarPersonal(modalDesactivar.id, { activo: true })
      }
      setModalDesactivar(null)
      await cargarPersonal()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
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
              <span className="text-gray-700 font-medium">Personal</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
            <p className="text-sm text-gray-500 mt-0.5">Técnicos, vendedores y administradores</p>
          </div>
          <button
            onClick={abrirCrear}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar persona
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total activos</p>
            <p className="text-2xl font-bold text-gray-900">{activos.length}</p>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">👑 Administradores</p>
            <p className="text-2xl font-bold text-purple-700">{admins}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">🔧 Técnicos</p>
            <p className="text-2xl font-bold text-blue-700">{tecnicos}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">🛒 Vendedores</p>
            <p className="text-2xl font-bold text-green-700">{vendedores}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, DNI, email, teléfono..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filtroRol}
              onChange={e => setFiltroRol(e.target.value as typeof filtroRol)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todos">Todos los roles</option>
              <option value="administrador">Administrador</option>
              <option value="tecnico">Técnico</option>
              <option value="vendedor">Vendedor</option>
            </select>
            <button
              onClick={() => setMostrarInactivos(!mostrarInactivos)}
              className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                mostrarInactivos
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
            </button>
          </div>
        </div>

        {/* Error / Loading */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Grid de tarjetas */}
        {!loading && !error && (
          <>
            {personalFiltrado.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-500 font-medium">No hay resultados</p>
                <p className="text-sm text-gray-400 mt-1">Prueba con otros filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalFiltrado.map(p => (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border p-5 transition-all ${
                      p.activo ? 'border-gray-200 hover:shadow-md' : 'border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${AVATAR_BG[p.rol]}`}>
                        {getIniciales(p.nombre_completo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{p.nombre_completo}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${ROL_COLOR[p.rol]}`}>
                              {ROL_ICON[p.rol]} {ROL_LABEL[p.rol]}
                            </span>
                          </div>
                          {!p.activo && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">Inactivo</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Datos */}
                    <div className="mt-4 space-y-1.5">
                      {p.dni && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
                          </svg>
                          DNI: {p.dni}
                        </div>
                      )}
                      {p.telefono && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {p.telefono}
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{p.email}</span>
                        </div>
                      )}
                      {p.notas && (
                        <p className="text-xs text-gray-400 italic truncate mt-1">{p.notas}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setModalDesactivar(p)}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                          p.activo
                            ? 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {p.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL CREAR / EDITAR ───────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModalAbierto(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {personaEditando ? 'Editar persona' : 'Agregar persona'}
                </h2>
                <button onClick={() => !guardando && setModalAbierto(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {errForm && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errForm}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre_completo}
                    onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                    placeholder="Ej: Juan Pérez García"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['administrador', 'tecnico', 'vendedor'] as RolPersonal[]).map(rol => (
                      <button
                        key={rol}
                        onClick={() => setForm({ ...form, rol })}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors text-center ${
                          form.rol === rol
                            ? rol === 'administrador' ? 'bg-purple-600 text-white border-purple-600'
                              : rol === 'tecnico' ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {ROL_ICON[rol]} {ROL_LABEL[rol]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                    <input
                      type="text"
                      value={form.dni ?? ''}
                      onChange={e => setForm({ ...form, dni: e.target.value })}
                      placeholder="12345678"
                      maxLength={8}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={form.telefono ?? ''}
                      onChange={e => setForm({ ...form, telefono: e.target.value })}
                      placeholder="+51 999 999 999"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.notas ?? ''}
                    onChange={e => setForm({ ...form, notas: e.target.value })}
                    placeholder="Observaciones opcionales..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => !guardando && setModalAbierto(false)}
                  disabled={guardando}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {guardando && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {guardando ? 'Guardando...' : personaEditando ? 'Guardar cambios' : 'Agregar persona'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESACTIVAR / REACTIVAR ──────────────────────────────────── */}
      {modalDesactivar && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalDesactivar(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modalDesactivar.activo ? 'bg-amber-100' : 'bg-green-100'}`}>
                <span className="text-2xl">{modalDesactivar.activo ? '⏸️' : '▶️'}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {modalDesactivar.activo ? 'Desactivar persona' : 'Reactivar persona'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                ¿{modalDesactivar.activo ? 'Desactivar' : 'Reactivar'} a <strong>{modalDesactivar.nombre_completo}</strong>?
                {modalDesactivar.activo && ' No aparecerá en los selectores del sistema.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModalDesactivar(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={confirmarDesactivar}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${modalDesactivar.activo ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {modalDesactivar.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
