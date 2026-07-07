// Ubicación final: app/tickets/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

/* ------------------------------------------------------------------ */
/* Tipos                                                                */
/* ------------------------------------------------------------------ */

type EstadoTicket = 'Nuevo' | 'Asignado' | 'En progreso' | 'En espera' | 'Completado' | 'Cerrado' | 'Facturado' | 'Cancelado'
type PrioridadTicket = 'Bajo' | 'Normal' | 'Alta' | 'Urgente'

type Ticket = {
  id: string
  numero_ticket: number
  cliente_id: string
  tipo_servicio_id: string
  tecnico_asignado_id?: string | null
  descripcion_problema: string
  prioridad: PrioridadTicket
  estado: EstadoTicket
  tipo_equipo?: string | null
  marca_equipo?: string | null
  modelo_equipo?: string | null
  serie_equipo?: string | null
  sistema_operativo?: string | null
  descripcion_equipo?: string | null
  fecha_creacion: string
  fecha_promesa?: string | null
  fecha_inicio?: string | null
  fecha_termino?: string | null
  observaciones?: string | null
  created_at: string
  updated_at: string
  clientes?: { nombre_completo: string; telefono_1?: string; email?: string }
  tecnicos?: { nombre_completo: string; telefono?: string }
  tipos_servicio?: { nombre: string }
}

type Cliente = { id: string; nombre_completo: string; telefono_1?: string | null; dni_ruc?: string | null }
type Tecnico = { id: string; nombre_completo: string }
type TipoServicio = { id: string; nombre: string }

type TicketFormData = {
  cliente_id: string
  tipo_servicio_id: string
  descripcion_problema: string
  prioridad: PrioridadTicket
  tipo_equipo: string
  marca_equipo: string
  modelo_equipo: string
  serie_equipo: string
  sistema_operativo: string
  observaciones: string
  fecha_promesa: string
  tecnico_asignado_id: string
}

const FORM_VACIO: TicketFormData = {
  cliente_id: '',
  tipo_servicio_id: '',
  descripcion_problema: '',
  prioridad: 'Normal',
  tipo_equipo: '',
  marca_equipo: '',
  modelo_equipo: '',
  serie_equipo: '',
  sistema_operativo: '',
  observaciones: '',
  fecha_promesa: '',
  tecnico_asignado_id: '',
}

const ESTADOS: EstadoTicket[] = ['Nuevo', 'Asignado', 'En progreso', 'En espera', 'Completado', 'Cerrado', 'Facturado', 'Cancelado']
const PRIORIDADES: PrioridadTicket[] = ['Bajo', 'Normal', 'Alta', 'Urgente']

const ESTADO_ESTILOS: Record<EstadoTicket, string> = {
  'Nuevo': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'Asignado': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  'En progreso': 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  'En espera': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  'Completado': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Cerrado': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'Facturado': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  'Cancelado': 'bg-red-50 text-red-600 ring-1 ring-red-200',
}

const PRIORIDAD_ESTILOS: Record<PrioridadTicket, string> = {
  'Bajo': 'text-slate-400',
  'Normal': 'text-slate-600',
  'Alta': 'text-orange-500',
  'Urgente': 'text-red-600 font-semibold',
}

function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

type SemaforoInfo = { texto: string; bg: string; text: string; dot: string; bgFila: string; borderFila: string }

function getSemaforo(fechaPromesa: string | null | undefined, estado: EstadoTicket): SemaforoInfo {
  const ESTADOS_FINALES: EstadoTicket[] = ['Completado', 'Cerrado', 'Cancelado', 'Facturado']
  if (!fechaPromesa || ESTADOS_FINALES.includes(estado)) {
    return { texto: '', bg: '', text: '', dot: '', bgFila: '', borderFila: '' }
  }
  const ahora = Date.now()
  const promesa = new Date(fechaPromesa).getTime()
  const horasRestantes = (promesa - ahora) / (1000 * 60 * 60)
  const diasRestantes = horasRestantes / 24

  if (horasRestantes < 24) {
    const vencido = horasRestantes < 0
    return {
      texto: vencido ? `Vencido` : `${Math.ceil(horasRestantes)}h`,
      bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500',
      bgFila: 'bg-red-50/70 hover:bg-red-100/70', borderFila: 'border-l-4 border-l-red-500',
    }
  }
  if (diasRestantes <= 2) return {
    texto: `${Math.ceil(diasRestantes)}d`, bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500',
    bgFila: 'bg-orange-50/70 hover:bg-orange-100/70', borderFila: 'border-l-4 border-l-orange-500',
  }
  if (diasRestantes <= 5) return {
    texto: `${Math.ceil(diasRestantes)}d`, bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500',
    bgFila: 'bg-yellow-50/70 hover:bg-yellow-100/70', borderFila: 'border-l-4 border-l-yellow-500',
  }
  return {
    texto: `${Math.ceil(diasRestantes)}d`, bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500',
    bgFila: 'bg-green-50/50 hover:bg-green-100/50', borderFila: 'border-l-4 border-l-green-400',
  }
}

function SemaforoBadge({ fechaPromesa, estado }: { fechaPromesa: string | null | undefined; estado: EstadoTicket }) {
  const sem = getSemaforo(fechaPromesa, estado)
  if (!sem.texto) return null
  return (
    <div className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full ${sem.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sem.dot}`} />
      <span className={`text-xs font-medium ${sem.text}`}>{sem.texto}</span>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
const labelClass = 'mb-1 block text-sm font-medium text-slate-700'

/* ------------------------------------------------------------------ */
/* Buscador de clientes con autocompletado (case sensitive)             */
/* ------------------------------------------------------------------ */

function BuscadorCliente({
  clientes,
  clienteIdSeleccionado,
  onSeleccionar,
  cargandoClientes,
}: {
  clientes: Cliente[]
  clienteIdSeleccionado: string
  onSeleccionar: (id: string) => void
  cargandoClientes: boolean
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Sincroniza el texto visible con el cliente seleccionado (por ejemplo al editar)
  useEffect(() => {
    const seleccionado = clientes.find(c => c.id === clienteIdSeleccionado)
    if (seleccionado) setTexto(seleccionado.nombre_completo)
    if (!clienteIdSeleccionado) setTexto('')
  }, [clienteIdSeleccionado, clientes])

  // Cierra la lista al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const coincidencias = useMemo(() => {
    const termino = texto.trim()
    if (!termino) return clientes.slice(0, 8)
    // Case sensitive: distingue mayúsculas y minúsculas tal como se escribe
    return clientes.filter(c =>
      c.nombre_completo.includes(termino) ||
      (c.dni_ruc ?? '').includes(termino) ||
      (c.telefono_1 ?? '').includes(termino)
    ).slice(0, 8)
  }, [clientes, texto])

  function elegir(cliente: Cliente) {
    onSeleccionar(cliente.id)
    setTexto(cliente.nombre_completo)
    setAbierto(false)
  }

  function handleChangeTexto(valor: string) {
    setTexto(valor)
    setAbierto(true)
    if (clienteIdSeleccionado) onSeleccionar('') // si edita el texto, invalida la selección previa
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        className={inputClass}
        value={texto}
        onChange={e => handleChangeTexto(e.target.value)}
        onFocus={() => setAbierto(true)}
        placeholder={cargandoClientes ? 'Cargando clientes…' : 'Escribe el nombre, DNI/RUC o teléfono…'}
        disabled={cargandoClientes}
        autoComplete="off"
      />
      {clienteIdSeleccionado && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
          <CheckIcon />
        </span>
      )}
      {abierto && !cargandoClientes && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {coincidencias.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sin coincidencias.</p>
          ) : (
            coincidencias.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
              >
                <div className="font-medium text-slate-800">{c.nombre_completo}</div>
                <div className="text-xs text-slate-400">
                  {[c.dni_ruc, c.telefono_1].filter(Boolean).join(' · ') || 'Sin más datos'}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                               */
/* ------------------------------------------------------------------ */

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoClientes, setCargandoClientes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoTicket | 'Todos'>('Todos')
  const [filtroTecnico, setFiltroTecnico] = useState<string>('todos')

  const [modalCrear, setModalCrear] = useState(false)
  const [ticketEditando, setTicketEditando] = useState<Ticket | null>(null)
  const [formData, setFormData] = useState<TicketFormData>(FORM_VACIO)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [modalAsignar, setModalAsignar] = useState<Ticket | null>(null)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('')
  const [asignando, setAsignando] = useState(false)

  const [modalEstado, setModalEstado] = useState<Ticket | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoTicket>('Nuevo')
  const [actualizandoEstado, setActualizandoEstado] = useState(false)

  const [ticketAEliminar, setTicketAEliminar] = useState<Ticket | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    try {
      setCargando(true)
      setError(null)
      const { obtenerTickets, obtenerClientes, obtenerTecnicos, obtenerTiposServicio } = await import('@/lib/db')
      const [t, c, tc, ts] = await Promise.all([
        obtenerTickets(),
        obtenerClientes(),
        obtenerTecnicos ? obtenerTecnicos() : Promise.resolve([]),
        obtenerTiposServicio ? obtenerTiposServicio() : Promise.resolve([]),
      ])
      setTickets((t ?? []) as Ticket[])
      setClientes((c ?? []) as Cliente[])
      setTecnicos((tc ?? []) as Tecnico[])
      setTiposServicio((ts ?? []) as TipoServicio[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tickets.')
    } finally {
      setCargando(false)
    }
  }

  // Refresca solo la lista de clientes (rápido, en segundo plano).
  // Se llama cada vez que se abre el modal de crear/editar ticket,
  // así siempre se ven los clientes más recientes sin recargar la página.
  async function refrescarClientes() {
    try {
      setCargandoClientes(true)
      const { obtenerClientes } = await import('@/lib/db')
      const c = await obtenerClientes()
      setClientes((c ?? []) as Cliente[])
    } catch {
      // si falla el refresco silencioso, se sigue usando la lista que ya había en memoria
    } finally {
      setCargandoClientes(false)
    }
  }

  const ticketsFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return tickets.filter((t) => {
      if (filtroEstado !== 'Todos' && t.estado !== filtroEstado) return false
      if (filtroTecnico !== 'todos' && t.tecnico_asignado_id !== filtroTecnico) return false
      if (!termino) return true
      const campos = [
        t.clientes?.nombre_completo,
        t.tipos_servicio?.nombre,
        t.tipo_equipo,
        t.marca_equipo,
        t.modelo_equipo,
        String(t.numero_ticket),
      ]
      return campos.some((c) => (c ?? '').toLowerCase().includes(termino))
    })
  }, [tickets, busqueda, filtroEstado, filtroTecnico])

  const totales = useMemo(() => ({
    total: tickets.length,
    nuevos: tickets.filter(t => t.estado === 'Nuevo').length,
    enProgreso: tickets.filter(t => t.estado === 'En progreso').length,
    urgentes: tickets.filter(t => t.prioridad === 'Urgente').length,
  }), [tickets])

  // ── Crear / Editar ──────────────────────────────────────────────

  function abrirCrear() {
    setTicketEditando(null)
    setFormData(FORM_VACIO)
    setErrorForm(null)
    setModalCrear(true)
    refrescarClientes() // trae clientes nuevos sin que el usuario tenga que recargar la página
  }

  function abrirEditar(ticket: Ticket) {
    setTicketEditando(ticket)
    setFormData({
      cliente_id: ticket.cliente_id,
      tipo_servicio_id: ticket.tipo_servicio_id,
      descripcion_problema: ticket.descripcion_problema,
      prioridad: ticket.prioridad,
      tipo_equipo: ticket.tipo_equipo ?? '',
      marca_equipo: ticket.marca_equipo ?? '',
      modelo_equipo: ticket.modelo_equipo ?? '',
      serie_equipo: ticket.serie_equipo ?? '',
      sistema_operativo: ticket.sistema_operativo ?? '',
      observaciones: ticket.observaciones ?? '',
      fecha_promesa: ticket.fecha_promesa ? ticket.fecha_promesa.slice(0, 16) : '',
      tecnico_asignado_id: ticket.tecnico_asignado_id ?? '',
    })
    setErrorForm(null)
    setModalCrear(true)
    refrescarClientes()
  }

  function handleChange(campo: keyof TicketFormData, valor: string) {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)
    if (!formData.cliente_id) { setErrorForm('Selecciona un cliente de la lista (debe quedar marcado con el check verde).'); return }
    if (!formData.tipo_servicio_id) { setErrorForm('Selecciona un tipo de servicio.'); return }
    if (!formData.descripcion_problema.trim()) { setErrorForm('La descripción del problema es obligatoria.'); return }

    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as Record<string, unknown>

    // Si se asigna técnico desde la creación, el estado inicial pasa a "Asignado"
    if (!ticketEditando && formData.tecnico_asignado_id) {
      payload.estado = 'Asignado'
    }

    try {
      setGuardando(true)
      const { crearTicket, actualizarTicket } = await import('@/lib/db')
      if (ticketEditando) {
        const actualizado = await actualizarTicket(ticketEditando.id, payload)
        setTickets(prev => prev.map(t => t.id === ticketEditando.id ? { ...t, ...(actualizado as Ticket) } : t))
      } else {
        await crearTicket(payload as any)
        await cargarTodo() // refresca tickets (incluye datos del cliente recién vinculado)
      }
      setModalCrear(false)
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar el ticket.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Asignar técnico ─────────────────────────────────────────────

  function abrirAsignar(ticket: Ticket) {
    setModalAsignar(ticket)
    setTecnicoSeleccionado(ticket.tecnico_asignado_id ?? '')
  }

  async function confirmarAsignar() {
    if (!modalAsignar || !tecnicoSeleccionado) return
    try {
      setAsignando(true)
      const { asignarTicket } = await import('@/lib/db')
      await asignarTicket(modalAsignar.id, tecnicoSeleccionado)
      await cargarTodo()
      setModalAsignar(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar el técnico.')
    } finally {
      setAsignando(false)
    }
  }

  // ── Cambiar estado ──────────────────────────────────────────────

  function abrirCambiarEstado(ticket: Ticket) {
    setModalEstado(ticket)
    setNuevoEstado(ticket.estado)
  }

  async function confirmarCambiarEstado() {
    if (!modalEstado) return
    try {
      setActualizandoEstado(true)
      const { actualizarEstadoTicket } = await import('@/lib/db')
      await actualizarEstadoTicket(modalEstado.id, nuevoEstado)
      setTickets(prev => prev.map(t => t.id === modalEstado.id ? { ...t, estado: nuevoEstado } : t))
      setModalEstado(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setActualizandoEstado(false)
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────

  async function confirmarEliminar() {
    if (!ticketAEliminar) return
    try {
      setEliminando(true)
      const { eliminarTicket } = await import('@/lib/db')
      await eliminarTicket(ticketAEliminar.id)
      setTickets(prev => prev.filter(t => t.id !== ticketAEliminar.id))
      setTicketAEliminar(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el ticket.')
    } finally {
      setEliminando(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Tickets</h1>
            <p className="mt-1 text-sm text-slate-500">Gestión de solicitudes de servicio técnico.</p>
          </div>
          <button onClick={abrirCrear} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
            <PlusIcon /> Nuevo ticket
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumenCard etiqueta="Total" valor={totales.total} color="slate" />
          <ResumenCard etiqueta="Nuevos" valor={totales.nuevos} color="blue" />
          <ResumenCard etiqueta="En progreso" valor={totales.enProgreso} color="yellow" />
          <ResumenCard etiqueta="Urgentes" valor={totales.urgentes} color="red" />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, equipo, # ticket..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoTicket | 'Todos')}
            className={`${inputClass} w-full lg:w-48`}
          >
            <option value="Todos">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            value={filtroTecnico}
            onChange={e => setFiltroTecnico(e.target.value)}
            className={`${inputClass} w-full lg:w-48`}
          >
            <option value="todos">Todos los técnicos</option>
            <option value="">Sin asignar</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={cargarTodo} className="font-semibold underline">Reintentar</button>
          </div>
        )}

        {cargando ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">{tickets.length === 0 ? 'No hay tickets registrados todavía.' : 'Ningún ticket coincide con la búsqueda.'}</p>
            {tickets.length === 0 && (
              <button onClick={abrirCrear} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <PlusIcon /> Nuevo ticket
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Servicio / Equipo</th>
                    <th className="px-4 py-3 font-medium">Técnico</th>
                    <th className="px-4 py-3 font-medium">Prioridad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ticketsFiltrados.map(ticket => {
                    const sem = getSemaforo(ticket.fecha_promesa, ticket.estado)
                    return (
                    <tr key={ticket.id} className={`transition-colors ${sem.bgFila || 'hover:bg-slate-50/80'} ${sem.borderFila}`}>
                      <td className="px-4 py-3 font-mono text-xs">
                        <a href={`/tickets/${ticket.id}`} className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold">
                          #{ticket.numero_ticket}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{ticket.clientes?.nombre_completo ?? '—'}</div>
                        {ticket.clientes?.telefono_1 && <div className="text-xs text-slate-400">{ticket.clientes.telefono_1}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{ticket.tipos_servicio?.nombre ?? '—'}</div>
                        {(ticket.marca_equipo || ticket.tipo_equipo) && (
                          <div className="text-xs text-slate-400">{[ticket.tipo_equipo, ticket.marca_equipo, ticket.modelo_equipo].filter(Boolean).join(' · ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ticket.tecnicos?.nombre_completo ?? <span className="italic text-slate-400">Sin asignar</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${PRIORIDAD_ESTILOS[ticket.prioridad]}`}>{ticket.prioridad}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_ESTILOS[ticket.estado]}`}>{ticket.estado}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-500">{formatearFecha(ticket.fecha_creacion)}</div>
                        <SemaforoBadge fechaPromesa={ticket.fecha_promesa} estado={ticket.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirCambiarEstado(ticket)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Estado</button>
                          <button onClick={() => abrirAsignar(ticket)} className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50">Asignar</button>
                          <button onClick={() => abrirEditar(ticket)} className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Editar</button>
                          <button onClick={() => setTicketAEliminar(ticket)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {ticketsFiltrados.map(ticket => {
                const sem = getSemaforo(ticket.fecha_promesa, ticket.estado)
                return (
                <div key={ticket.id} className={`rounded-xl border p-4 shadow-sm transition-colors ${sem.bgFila ? `${sem.bgFila} ${sem.borderFila} border-slate-200` : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a href={`/tickets/${ticket.id}`} className="font-mono text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold">
                        #{ticket.numero_ticket}
                      </a>
                      <div className="font-medium text-slate-800">{ticket.clientes?.nombre_completo ?? '—'}</div>
                      <div className="text-sm text-slate-500">{ticket.tipos_servicio?.nombre}</div>
                    </div>
                    <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_ESTILOS[ticket.estado]}`}>{ticket.estado}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Técnico</dt>
                      <dd className="text-slate-700">{ticket.tecnicos?.nombre_completo ?? <span className="italic text-slate-400">Sin asignar</span>}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Prioridad</dt>
                      <dd className={`font-medium ${PRIORIDAD_ESTILOS[ticket.prioridad]}`}>{ticket.prioridad}</dd>
                    </div>
                    {(ticket.tipo_equipo || ticket.marca_equipo) && (
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-400">Equipo</dt>
                        <dd className="text-slate-700">{[ticket.tipo_equipo, ticket.marca_equipo, ticket.modelo_equipo].filter(Boolean).join(' · ')}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-slate-400">Fecha</dt>
                      <dd className="text-slate-700">{formatearFecha(ticket.fecha_creacion)}</dd>
                      <SemaforoBadge fechaPromesa={ticket.fecha_promesa} estado={ticket.estado} />
                    </div>
                  </dl>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <button onClick={() => abrirCambiarEstado(ticket)} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">Estado</button>
                    <button onClick={() => abrirAsignar(ticket)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">Asignar</button>
                    <button onClick={() => abrirEditar(ticket)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Editar</button>
                    <button onClick={() => setTicketAEliminar(ticket)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">Eliminar</button>
                  </div>
                </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Modal Crear / Editar ─────────────────────────────────── */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{ticketEditando ? 'Editar ticket' : 'Nuevo ticket'}</h2>
                <button type="button" onClick={() => setModalCrear(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><XIcon /></button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="cliente_buscador">Cliente <span className="text-emerald-600">*</span></label>
                    <BuscadorCliente
                      clientes={clientes}
                      clienteIdSeleccionado={formData.cliente_id}
                      onSeleccionar={id => handleChange('cliente_id', id)}
                      cargandoClientes={cargandoClientes}
                    />
                    <p className="mt-1 text-xs text-slate-400">Escribe para buscar (distingue mayúsculas y minúsculas). La lista se actualiza automáticamente.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tipo_servicio_id">Tipo de servicio <span className="text-emerald-600">*</span></label>
                    <select id="tipo_servicio_id" className={inputClass} value={formData.tipo_servicio_id} onChange={e => handleChange('tipo_servicio_id', e.target.value)}>
                      <option value="">Selecciona un servicio</option>
                      {tiposServicio.map(ts => <option key={ts.id} value={ts.id}>{ts.nombre}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="descripcion_problema">Descripción del problema <span className="text-emerald-600">*</span></label>
                    <textarea id="descripcion_problema" rows={3} className={inputClass} value={formData.descripcion_problema} onChange={e => handleChange('descripcion_problema', e.target.value)} placeholder="Describe el problema del cliente..." />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="prioridad">Prioridad</label>
                    <select id="prioridad" className={inputClass} value={formData.prioridad} onChange={e => handleChange('prioridad', e.target.value as PrioridadTicket)}>
                      {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="fecha_promesa">Fecha de entrega acordada</label>
                    <input id="fecha_promesa" type="datetime-local" className={inputClass} value={formData.fecha_promesa} onChange={e => handleChange('fecha_promesa', e.target.value)} />
                    <p className="mt-1 text-xs text-slate-400">Opcional — déjalo vacío si aún no se acuerda con el cliente</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="tecnico_asignado_id">Técnico asignado</label>
                    <select id="tecnico_asignado_id" className={inputClass} value={formData.tecnico_asignado_id} onChange={e => handleChange('tecnico_asignado_id', e.target.value)}>
                      <option value="">Sin asignar todavía</option>
                      {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">Opcional — si eliges un técnico, el ticket pasará a estado &quot;Asignado&quot;</p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tipo_equipo">Tipo de equipo</label>
                    <input id="tipo_equipo" className={inputClass} value={formData.tipo_equipo} onChange={e => handleChange('tipo_equipo', e.target.value)} placeholder="PC, Laptop, Impresora..." />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="marca_equipo">Marca</label>
                    <input id="marca_equipo" className={inputClass} value={formData.marca_equipo} onChange={e => handleChange('marca_equipo', e.target.value)} placeholder="HP, Dell, Lenovo..." />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="modelo_equipo">Modelo</label>
                    <input id="modelo_equipo" className={inputClass} value={formData.modelo_equipo} onChange={e => handleChange('modelo_equipo', e.target.value)} placeholder="EliteBook 840 G5..." />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="serie_equipo">N° de serie</label>
                    <input id="serie_equipo" className={inputClass} value={formData.serie_equipo} onChange={e => handleChange('serie_equipo', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="sistema_operativo">Sistema operativo</label>
                    <input id="sistema_operativo" className={inputClass} value={formData.sistema_operativo} onChange={e => handleChange('sistema_operativo', e.target.value)} placeholder="Windows 11, Ubuntu..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="observaciones">Observaciones</label>
                    <textarea id="observaciones" rows={2} className={inputClass} value={formData.observaciones} onChange={e => handleChange('observaciones', e.target.value)} placeholder="Notas adicionales..." />
                  </div>
                </div>
                {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button type="button" onClick={() => setModalCrear(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={guardando} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {guardando ? 'Guardando…' : ticketEditando ? 'Guardar cambios' : 'Crear ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Asignar Técnico ────────────────────────────────── */}
      {modalAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Asignar técnico</h2>
            <p className="mt-1 text-sm text-slate-500">Ticket #{modalAsignar.numero_ticket} — {modalAsignar.clientes?.nombre_completo}</p>
            <div className="mt-4">
              <label className={labelClass} htmlFor="tecnico_select">Técnico</label>
              <select id="tecnico_select" className={inputClass} value={tecnicoSeleccionado} onChange={e => setTecnicoSeleccionado(e.target.value)}>
                <option value="">Selecciona un técnico</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalAsignar(null)} disabled={asignando} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmarAsignar} disabled={asignando || !tecnicoSeleccionado} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {asignando ? 'Asignando…' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cambiar Estado ─────────────────────────────────── */}
      {modalEstado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Cambiar estado</h2>
            <p className="mt-1 text-sm text-slate-500">Ticket #{modalEstado.numero_ticket} — {modalEstado.clientes?.nombre_completo}</p>
            <div className="mt-4">
              <label className={labelClass} htmlFor="estado_select">Nuevo estado</label>
              <select id="estado_select" className={inputClass} value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value as EstadoTicket)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <div className="mt-3">
                <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${ESTADO_ESTILOS[nuevoEstado]}`}>{nuevoEstado}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalEstado(null)} disabled={actualizandoEstado} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmarCambiarEstado} disabled={actualizandoEstado} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {actualizandoEstado ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar ───────────────────────────────────────── */}
      {ticketAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Eliminar ticket</h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Seguro que quieres eliminar el ticket <span className="font-medium">#{ticketAEliminar.numero_ticket}</span> de <span className="font-medium">{ticketAEliminar.clientes?.nombre_completo}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setTicketAEliminar(null)} disabled={eliminando} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmarEliminar} disabled={eliminando} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
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

function ResumenCard({ etiqueta, valor, color }: { etiqueta: string; valor: number; color: 'slate' | 'blue' | 'yellow' | 'red' }) {
  const colores = { slate: 'text-slate-900', blue: 'text-blue-600', yellow: 'text-yellow-600', red: 'text-red-600' }
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-bold ${colores[color]}`}>{valor}</p>
    </div>
  )
}

function PlusIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" /></svg>
}
function SearchIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}><circle cx="9" cy="9" r="6" /><path strokeLinecap="round" d="m13.5 13.5 3 3" /></svg>
}
function XIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5"><path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" /></svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
}
