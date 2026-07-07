import { supabase } from './supabase'

/* ------------------------------------------------------------------ */
/* TIPOS                                                                */
/* ------------------------------------------------------------------ */

export type Cliente = {
  id: string
  nombre_completo: string
  tipo_cliente: 'particular' | 'corporativo'
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

export type ClientePayload = Partial<
  Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'fecha_registro' | 'ultima_interaccion'>
> & {
  nombre_completo: string
  tipo_cliente: 'particular' | 'corporativo'
}

export type EstadoTicket = 'Nuevo' | 'Asignado' | 'En progreso' | 'En espera' | 'Completado' | 'Cerrado' | 'Facturado' | 'Cancelado'
export type PrioridadTicket = 'Bajo' | 'Normal' | 'Alta' | 'Urgente'

export type Ticket = {
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
  clientes?: { nombre_completo: string; telefono_1?: string; email?: string; direccion?: string }
  tecnicos?: { nombre_completo: string; telefono?: string; tarifa_por_hora?: number }
  tipos_servicio?: { nombre: string; precio_base?: number }
}

/* ------------------------------------------------------------------ */
/* CLIENTES                                                             */
/* ------------------------------------------------------------------ */

export async function obtenerClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Cliente[]
}

export async function obtenerClientePorId(id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Cliente
}

export async function crearCliente(cliente: ClientePayload) {
  const { data, error } = await supabase.from('clientes').insert([cliente]).select()
  if (error) throw new Error(error.message)
  return data[0] as Cliente
}

export async function actualizarCliente(id: string, cambios: Partial<ClientePayload>) {
  const { data, error } = await supabase
    .from('clientes')
    .update(cambios)
    .eq('id', id)
    .select()
  if (error) throw new Error(error.message)
  return data[0] as Cliente
}

export async function eliminarCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

/* ------------------------------------------------------------------ */
/* TICKETS                                                              */
/* ------------------------------------------------------------------ */

export async function obtenerTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      clientes(nombre_completo, telefono_1, email),
      tecnicos(nombre_completo, telefono),
      tipos_servicio(nombre)
    `)
    .order('fecha_creacion', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Ticket[]
}

export async function obtenerTicketPorId(id: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      clientes(nombre_completo, telefono_1, email, direccion),
      tecnicos(nombre_completo, tarifa_por_hora),
      tipos_servicio(nombre, precio_base)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Ticket
}

export async function crearTicket(ticket: {
  cliente_id: string
  tipo_servicio_id: string
  descripcion_problema: string
  prioridad?: string
  tipo_equipo?: string
  marca_equipo?: string
  modelo_equipo?: string
  serie_equipo?: string
  sistema_operativo?: string
  observaciones?: string
}) {
  const { data, error } = await supabase
    .from('tickets')
    .insert([{ ...ticket, estado: 'Nuevo', fecha_creacion: new Date().toISOString() }])
    .select()
  if (error) throw new Error(error.message)
  return data[0] as Ticket
}

export async function asignarTicket(ticketId: string, tecnicoId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .update({
      tecnico_asignado_id: tecnicoId,
      estado: 'Asignado',
      fecha_inicio: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
  if (error) throw new Error(error.message)
  return data[0] as Ticket
}

export async function actualizarEstadoTicket(id: string, estado: string) {
  const { data, error } = await supabase
    .from('tickets')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
  if (error) throw new Error(error.message)
  return data[0] as Ticket
}

export async function actualizarTicket(id: string, updates: Partial<Ticket>) {
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
  if (error) throw new Error(error.message)
  return data[0] as Ticket
}

export async function eliminarTicket(id: string) {
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

/* ------------------------------------------------------------------ */
/* TÉCNICOS                                                             */
/* ------------------------------------------------------------------ */

export async function obtenerTecnicos() {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, nombre_completo, telefono, email')
    .order('nombre_completo', { ascending: true })
  if (error) throw error
  return data
}

/* ------------------------------------------------------------------ */
/* TIPOS DE SERVICIO                                                    */
/* ------------------------------------------------------------------ */

export async function obtenerTiposServicio() {
  const { data, error } = await supabase
    .from('tipos_servicio')
    .select('id, nombre, precio_base, descripcion')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

// =============================================
// AGREGAR ESTO AL FINAL DE lib/db.ts
// =============================================

// TIPOS DE INVENTARIO
export type CategoriaInventario = 'accesorio' | 'repuesto' | 'herramienta' | 'consumible' | 'otro'
export type UnidadMedida = 'unidad' | 'par' | 'kit' | 'metro' | 'litro' | 'gramo' | 'caja'

export type ItemInventario = {
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
  activo: boolean
  created_at: string
  updated_at: string
}

export type ItemInventarioPayload = Partial<Omit<ItemInventario, 'id' | 'created_at' | 'updated_at'>> & {
  nombre: string
  categoria: CategoriaInventario
  unidad_medida: UnidadMedida
  stock_actual: number
  stock_minimo: number
}

// INVENTARIO CRUD
export async function obtenerInventario() {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data as ItemInventario[]
}

export async function obtenerItemInventarioPorId(id: string) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ItemInventario
}

export async function crearItemInventario(item: ItemInventarioPayload) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('inventario')
    .insert([{ ...item, activo: true }])
    .select()
    .single()
  if (error) throw error
  return data as ItemInventario
}

export async function actualizarItemInventario(id: string, cambios: Partial<ItemInventarioPayload>) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('inventario')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ItemInventario
}

export async function ajustarStock(id: string, cantidad: number, tipo: 'entrada' | 'salida' | 'ajuste') {
  const { supabase } = await import('./supabase')
  // Primero obtener el stock actual
  const { data: item, error: errorGet } = await supabase
    .from('inventario')
    .select('stock_actual')
    .eq('id', id)
    .single()
  if (errorGet) throw errorGet

  let nuevoStock: number
  if (tipo === 'entrada') nuevoStock = item.stock_actual + cantidad
  else if (tipo === 'salida') nuevoStock = Math.max(0, item.stock_actual - cantidad)
  else nuevoStock = cantidad // ajuste directo

  const { data, error } = await supabase
    .from('inventario')
    .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ItemInventario
}

export async function eliminarItemInventario(id: string) {
  const { supabase } = await import('./supabase')
  const { error } = await supabase
    .from('inventario')
    .delete()
    .eq('id', id)
  if (error) throw error
}


// =============================================
// AGREGAR ESTO AL FINAL DE lib/db.ts
// =============================================

// TIPOS DE VENTAS
export type MetodoPago = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta'

export type ItemVenta = {
  inventario_id: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export type Venta = {
  id: string
  numero_venta: number
  cliente_id: string | null
  nombre_cliente_libre: string | null
  metodo_pago: MetodoPago
  items: ItemVenta[]
  subtotal: number
  descuento: number
  total: number
  notas: string | null
  vendedor_nombre: string | null
  created_at: string
  updated_at: string
  clientes?: { nombre_completo: string; telefono_1?: string | null; dni_ruc?: string | null } | null
}

export type VentaPayload = {
  cliente_id?: string | null
  nombre_cliente_libre?: string | null
  metodo_pago: MetodoPago
  items: ItemVenta[]
  subtotal: number
  descuento: number
  total: number
  notas?: string | null
  vendedor_nombre?: string | null
}

// VENTAS CRUD
export async function obtenerVentas() {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('ventas_accesorios')
    .select('*, clientes(nombre_completo, telefono_1, dni_ruc)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Venta[]
}

export async function obtenerVentaPorId(id: string) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('ventas_accesorios')
    .select('*, clientes(nombre_completo, telefono_1, dni_ruc)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Venta
}

export async function crearVenta(venta: VentaPayload) {
  const { supabase } = await import('./supabase')

  // 1. Insertar la venta
  const { data, error } = await supabase
    .from('ventas_accesorios')
    .insert([venta])
    .select()
    .single()
  if (error) throw error

  // 2. Descontar stock de cada item
  for (const item of venta.items) {
    const { data: inv, error: errGet } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('id', item.inventario_id)
      .single()
    if (errGet) throw errGet

    const nuevoStock = Math.max(0, inv.stock_actual - item.cantidad)
    const { error: errUpdate } = await supabase
      .from('inventario')
      .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
      .eq('id', item.inventario_id)
    if (errUpdate) throw errUpdate
  }

  return data as Venta
}

export async function eliminarVenta(id: string) {
  const { supabase } = await import('./supabase')
  const { error } = await supabase
    .from('ventas_accesorios')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// =============================================
// AGREGAR ESTO AL FINAL DE lib/db.ts
// =============================================

// TIPOS DE PERSONAL
export type RolPersonal = 'administrador' | 'tecnico' | 'vendedor'

export type Personal = {
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

export type PersonalPayload = Partial<Omit<Personal, 'id' | 'created_at' | 'updated_at'>> & {
  nombre_completo: string
  rol: RolPersonal
}

// PERSONAL CRUD
export async function obtenerPersonal() {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('personal')
    .select('*')
    .eq('activo', true)
    .order('rol', { ascending: true })
    .order('nombre_completo', { ascending: true })
  if (error) throw error
  return data as Personal[]
}

export async function obtenerTodoElPersonal() {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('personal')
    .select('*')
    .order('rol', { ascending: true })
    .order('nombre_completo', { ascending: true })
  if (error) throw error
  return data as Personal[]
}

export async function crearPersonal(p: PersonalPayload) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('personal')
    .insert([{ ...p, activo: true }])
    .select()
    .single()
  if (error) throw error
  return data as Personal
}

export async function actualizarPersonal(id: string, cambios: Partial<PersonalPayload>) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('personal')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Personal
}

export async function desactivarPersonal(id: string) {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('personal')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Personal
}