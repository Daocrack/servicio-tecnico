// Ubicación final: src/app/clientes/page.tsx
'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from '@/lib/db'

/* ------------------------------------------------------------------ */
/* Tipos                                                                */
/* ------------------------------------------------------------------ */

export type TipoCliente = 'particular' | 'corporativo'

export type Cliente = {
  id: string
  nombre_completo: string
  tipo_cliente: TipoCliente
  telefono_1: string | null
  telefono_2: string | null
  email: string | null
  dni_ruc: string | null
  direccion: string | null
  distrito: string | null
  nombre_empresa: string | null
  contacto_principal: string | null
  contacto_secundario: string | null
  email_facturacion: string | null
  direccion_facturacion: string | null
  notas: string | null
  fecha_registro: string | null
  ultima_interaccion: string | null
  created_at: string
  updated_at: string
}

type ClienteFormData = {
  nombre_completo: string
  tipo_cliente: TipoCliente
  telefono_1: string
  telefono_2: string
  email: string
  dni_ruc: string
  direccion: string
  distrito: string
  nombre_empresa: string
  contacto_principal: string
  contacto_secundario: string
  email_facturacion: string
  direccion_facturacion: string
  notas: string
}

const FORM_VACIO: ClienteFormData = {
  nombre_completo: '',
  tipo_cliente: 'particular',
  telefono_1: '',
  telefono_2: '',
  email: '',
  dni_ruc: '',
  direccion: '',
  distrito: '',
  nombre_empresa: '',
  contacto_principal: '',
  contacto_secundario: '',
  email_facturacion: '',
  direccion_facturacion: '',
  notas: '',
}

const DISTRITOS_OXAPAMPA = [
  'Oxapampa',
  'Chontabamba',
  'Huancabamba',
  'Pozuzo',
  'Villa Rica',
  'Palcazú',
  'Puerto Bermúdez',
  'Constitución',
]

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'

const labelClass = 'mb-1 block text-sm font-medium text-slate-700'

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Convierte campos de texto vacíos a `undefined` para no sobrescribir
// columnas con strings vacíos al guardar en Supabase.
function prepararPayload(form: ClienteFormData): Record<string, string | undefined> {
  const payload: Record<string, string | undefined> = {}
  for (const [clave, valor] of Object.entries(form)) {
    payload[clave] = valor === '' ? undefined : valor
  }
  return payload
}

/* ------------------------------------------------------------------ */
/* Página                                                               */
/* ------------------------------------------------------------------ */

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoCliente>('todos')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [formData, setFormData] = useState<ClienteFormData>(FORM_VACIO)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    try {
      setCargando(true)
      setError(null)
      const data = await obtenerClientes()
      setClientes((data ?? []) as Cliente[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.')
    } finally {
      setCargando(false)
    }
  }

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return clientes.filter((c) => {
      if (filtroTipo !== 'todos' && c.tipo_cliente !== filtroTipo) return false
      if (!termino) return true
      const camposBusqueda = [
        c.nombre_completo,
        c.nombre_empresa,
        c.dni_ruc,
        c.telefono_1,
        c.telefono_2,
        c.email,
        c.distrito,
      ]
      return camposBusqueda.some((campo) => (campo ?? '').toLowerCase().includes(termino))
    })
  }, [clientes, busqueda, filtroTipo])

  const totales = useMemo(
    () => ({
      total: clientes.length,
      particulares: clientes.filter((c) => c.tipo_cliente === 'particular').length,
      corporativos: clientes.filter((c) => c.tipo_cliente === 'corporativo').length,
    }),
    [clientes]
  )

  function abrirNuevo() {
    setClienteEditando(null)
    setFormData(FORM_VACIO)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirEdicion(cliente: Cliente) {
    setClienteEditando(cliente)
    setFormData({
      nombre_completo: cliente.nombre_completo ?? '',
      tipo_cliente: cliente.tipo_cliente,
      telefono_1: cliente.telefono_1 ?? '',
      telefono_2: cliente.telefono_2 ?? '',
      email: cliente.email ?? '',
      dni_ruc: cliente.dni_ruc ?? '',
      direccion: cliente.direccion ?? '',
      distrito: cliente.distrito ?? '',
      nombre_empresa: cliente.nombre_empresa ?? '',
      contacto_principal: cliente.contacto_principal ?? '',
      contacto_secundario: cliente.contacto_secundario ?? '',
      email_facturacion: cliente.email_facturacion ?? '',
      direccion_facturacion: cliente.direccion_facturacion ?? '',
      notas: cliente.notas ?? '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    if (guardando) return
    setModalAbierto(false)
    setClienteEditando(null)
  }

  function handleChange(campo: keyof ClienteFormData, valor: string) {
    setFormData((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)

    if (!formData.nombre_completo.trim()) {
      setErrorForm('El nombre completo es obligatorio.')
      return
    }
    if (formData.tipo_cliente === 'corporativo' && !formData.nombre_empresa.trim()) {
      setErrorForm('Para clientes corporativos, indica el nombre de la empresa.')
      return
    }

    // `as any`: tus funciones actuales de lib/db.ts pueden declarar un tipo
    // más estricto que no incluye todos los campos (notas, teléfono 2,
    // campos corporativos, etc). Ver lib_db_clientes_addendum.ts para
    // ampliar esos tipos y poder quitar este `as any`.
    const payload = prepararPayload(formData) as any

    try {
      setGuardando(true)
      if (clienteEditando) {
        const actualizado = await actualizarCliente(clienteEditando.id, payload)
        setClientes((prev) =>
          prev.map((c) =>
            c.id === clienteEditando.id ? { ...c, ...(actualizado as Cliente) } : c
          )
        )
      } else {
        const nuevo = await crearCliente(payload)
        setClientes((prev) => [nuevo as Cliente, ...prev])
      }
      setModalAbierto(false)
      setClienteEditando(null)
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar el cliente.')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!clienteAEliminar) return
    try {
      setEliminando(true)
      await eliminarCliente(clienteAEliminar.id)
      setClientes((prev) => prev.filter((c) => c.id !== clienteAEliminar.id))
      setClienteAEliminar(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el cliente.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Clientes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Particulares y empresas atendidas por Servicio Técnico Oxapampa.
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <PlusIcon />
            Nuevo cliente
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <ResumenCard etiqueta="Total" valor={totales.total} />
          <ResumenCard etiqueta="Particulares" valor={totales.particulares} />
          <ResumenCard etiqueta="Corporativos" valor={totales.corporativos} />
        </div>

        {/* Búsqueda y filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, empresa, DNI/RUC, teléfono, email o distrito"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex gap-2">
            {(
              [
                { valor: 'todos', etiqueta: 'Todos' },
                { valor: 'particular', etiqueta: 'Particulares' },
                { valor: 'corporativo', etiqueta: 'Corporativos' },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.valor}
                onClick={() => setFiltroTipo(opcion.valor)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filtroTipo === opcion.valor
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Error general */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={cargarClientes} className="font-semibold underline">
              Reintentar
            </button>
          </div>
        )}

        {/* Listado */}
        {cargando ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {clientes.length === 0
                ? 'Todavía no hay clientes registrados.'
                : 'Ningún cliente coincide con la búsqueda.'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {clientes.length === 0
                ? 'Registra al primer cliente para empezar a gestionar sus tickets y servicios.'
                : 'Ajusta el texto de búsqueda o los filtros.'}
            </p>
            {clientes.length === 0 && (
              <button
                onClick={abrirNuevo}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <PlusIcon />
                Nuevo cliente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tabla (escritorio) */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Distrito</th>
                    <th className="px-4 py-3 font-medium">Última interacción</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{cliente.nombre_completo}</div>
                        {cliente.tipo_cliente === 'corporativo' && cliente.nombre_empresa && (
                          <div className="text-xs text-slate-500">{cliente.nombre_empresa}</div>
                        )}
                        {cliente.dni_ruc && (
                          <div className="text-xs text-slate-400">{cliente.dni_ruc}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tipo={cliente.tipo_cliente} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cliente.telefono_1 && <div>{cliente.telefono_1}</div>}
                        {cliente.email && (
                          <div className="text-xs text-slate-400">{cliente.email}</div>
                        )}
                        {!cliente.telefono_1 && !cliente.email && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{cliente.distrito || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatearFecha(cliente.ultima_interaccion)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEdicion(cliente)}
                            className="rounded-md px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setClienteAEliminar(cliente)}
                            className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil) */}
            <div className="space-y-3 md:hidden">
              {clientesFiltrados.map((cliente) => (
                <div key={cliente.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-800">{cliente.nombre_completo}</div>
                      {cliente.tipo_cliente === 'corporativo' && cliente.nombre_empresa && (
                        <div className="text-xs text-slate-500">{cliente.nombre_empresa}</div>
                      )}
                    </div>
                    <Badge tipo={cliente.tipo_cliente} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-600">
                    {cliente.telefono_1 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Teléfono</dt>
                        <dd>{cliente.telefono_1}</dd>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-400">Email</dt>
                        <dd className="truncate text-right">{cliente.email}</dd>
                      </div>
                    )}
                    {cliente.distrito && (
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Distrito</dt>
                        <dd>{cliente.distrito}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Última interacción</dt>
                      <dd>{formatearFecha(cliente.ultima_interaccion)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => abrirEdicion(cliente)}
                      className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setClienteAEliminar(cliente)}
                      className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal crear / editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}
                </h2>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <XIcon />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {/* Tipo de cliente */}
                <div>
                  <span className={labelClass}>Tipo de cliente</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['particular', 'corporativo'] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleChange('tipo_cliente', tipo)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          formData.tipo_cliente === tipo
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tipo === 'particular' ? 'Particular' : 'Corporativo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datos generales */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="nombre_completo">
                      {formData.tipo_cliente === 'corporativo' ? 'Nombre del contacto' : 'Nombre completo'}
                      <span className="text-emerald-600"> *</span>
                    </label>
                    <input
                      id="nombre_completo"
                      className={inputClass}
                      value={formData.nombre_completo}
                      onChange={(e) => handleChange('nombre_completo', e.target.value)}
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="dni_ruc">DNI / RUC</label>
                    <input
                      id="dni_ruc"
                      className={inputClass}
                      value={formData.dni_ruc}
                      onChange={(e) => handleChange('dni_ruc', e.target.value)}
                      placeholder="00000000"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="distrito">Distrito</label>
                    <select
                      id="distrito"
                      className={inputClass}
                      value={formData.distrito}
                      onChange={(e) => handleChange('distrito', e.target.value)}
                    >
                      <option value="">Selecciona un distrito</option>
                      {DISTRITOS_OXAPAMPA.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="telefono_1">Teléfono principal</label>
                    <input
                      id="telefono_1"
                      className={inputClass}
                      value={formData.telefono_1}
                      onChange={(e) => handleChange('telefono_1', e.target.value)}
                      placeholder="+51 9xx xxx xxx"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="telefono_2">Teléfono secundario</label>
                    <input
                      id="telefono_2"
                      className={inputClass}
                      value={formData.telefono_2}
                      onChange={(e) => handleChange('telefono_2', e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className={inputClass}
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="direccion">Dirección</label>
                    <input
                      id="direccion"
                      className={inputClass}
                      value={formData.direccion}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                      placeholder="Calle, número, referencia"
                    />
                  </div>
                </div>

                {/* Datos corporativos */}
                {formData.tipo_cliente === 'corporativo' && (
                  <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Datos de la empresa</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor="nombre_empresa">
                          Nombre de la empresa<span className="text-emerald-600"> *</span>
                        </label>
                        <input
                          id="nombre_empresa"
                          className={inputClass}
                          value={formData.nombre_empresa}
                          onChange={(e) => handleChange('nombre_empresa', e.target.value)}
                          placeholder="Razón social"
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="contacto_principal">Contacto principal</label>
                        <input
                          id="contacto_principal"
                          className={inputClass}
                          value={formData.contacto_principal}
                          onChange={(e) => handleChange('contacto_principal', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="contacto_secundario">Contacto secundario</label>
                        <input
                          id="contacto_secundario"
                          className={inputClass}
                          value={formData.contacto_secundario}
                          onChange={(e) => handleChange('contacto_secundario', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor="email_facturacion">Email de facturación</label>
                        <input
                          id="email_facturacion"
                          type="email"
                          className={inputClass}
                          value={formData.email_facturacion}
                          onChange={(e) => handleChange('email_facturacion', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor="direccion_facturacion">Dirección de facturación</label>
                        <input
                          id="direccion_facturacion"
                          className={inputClass}
                          value={formData.direccion_facturacion}
                          onChange={(e) => handleChange('direccion_facturacion', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className={labelClass} htmlFor="notas">Notas</label>
                  <textarea
                    id="notas"
                    rows={3}
                    className={inputClass}
                    value={formData.notas}
                    onChange={(e) => handleChange('notas', e.target.value)}
                    placeholder="Observaciones internas sobre este cliente"
                  />
                </div>

                {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {guardando ? 'Guardando…' : clienteEditando ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {clienteAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Eliminar cliente</h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Seguro que quieres eliminar a{' '}
              <span className="font-medium">{clienteAEliminar.nombre_completo}</span>? Esta acción
              no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setClienteAEliminar(null)}
                disabled={eliminando}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={eliminando}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Componentes auxiliares                                               */
/* ------------------------------------------------------------------ */

function Badge({ tipo }: { tipo: TipoCliente }) {
  const esCorporativo = tipo === 'corporativo'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        esCorporativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {esCorporativo ? 'Corporativo' : 'Particular'}
    </span>
  )
}

function ResumenCard({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="9" cy="9" r="6" />
      <path strokeLinecap="round" d="m13.5 13.5 3 3" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
    </svg>
  )
}
