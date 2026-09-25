import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
  House,
  KeyRound,
  Layers,
  ListChecks,
  MessagesSquare,
  Palette,
  Plane,
  PlaneTakeoff,
  Route,
  Ruler,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { FileRouteTypes } from '@/routeTree.gen'
import { puede, type Permiso } from './permisos'

export type RutaApp = FileRouteTypes['to']

export type GrupoMenu =
  | 'General'
  | 'Matrícula'
  | 'Programa'
  | 'Operaciones de vuelo'
  | 'Evaluaciones'
  | 'Teoría'
  | 'Seguimiento'
  | 'Aprendizaje'

export const ORDEN_GRUPOS: readonly GrupoMenu[] = [
  'General',
  'Matrícula',
  'Programa',
  'Operaciones de vuelo',
  'Evaluaciones',
  'Teoría',
  'Seguimiento',
  'Aprendizaje',
]

export type Perfil = { permisos: ReadonlySet<Permiso>; rol: { nombre: string } }

export type Pantalla = {
  ruta: RutaApp
  titulo: string
  descripcion: string
  grupo: GrupoMenu
  icono: LucideIcon
  permiso?: Permiso
  roles?: readonly string[]
  padre?: RutaApp
  enMenu: boolean
  soloDesarrollo?: boolean
}

const PERSONAL = ['Administrador Web', 'Comandante de Escuadrón', 'Jefe de Operaciones', 'Instructor'] as const
const SOLO_ALUMNO = ['Alumno'] as const

export const PANTALLAS = {
  inicio: {
    ruta: '/',
    titulo: 'Inicio',
    descripcion: 'Resumen de su actividad en SIGEDA.',
    grupo: 'General',
    icono: House,
    enMenu: true,
  },
  cuenta: {
    ruta: '/cuenta',
    titulo: 'Cambiar contraseña',
    descripcion: 'Actualice la contraseña con la que ingresa a SIGEDA.',
    grupo: 'General',
    icono: KeyRound,
    permiso: 'Update',
    enMenu: false,
  },
  guia: {
    ruta: '/guia',
    titulo: 'Guía de estilo',
    descripcion: 'Referencia visual de componentes y estados del dominio.',
    grupo: 'General',
    icono: Palette,
    enMenu: true,
    soloDesarrollo: true,
  },
  turnos: {
    ruta: '/turnos',
    titulo: 'Programación de turnos',
    descripcion: 'Turnos de vuelo por sub fase, programa y fecha.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  ordenDeVuelo: {
    ruta: '/turnos/dia',
    titulo: 'Orden de vuelo del día',
    descripcion: 'Vuelos del día agrupados por aeronave y ordenados por hora.',
    grupo: 'Operaciones de vuelo',
    icono: PlaneTakeoff,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  ordenDeVueloDelDia: {
    ruta: '/turnos/dia/$fecha',
    titulo: 'Orden de vuelo del día',
    descripcion: 'Vuelos del día agrupados por aeronave y ordenados por hora.',
    grupo: 'Operaciones de vuelo',
    icono: PlaneTakeoff,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/turnos',
    enMenu: false,
  },
  registrarTurno: {
    ruta: '/turnos/nuevo',
    titulo: 'Registrar turno',
    descripcion: 'Programe un turno de vuelo con sus alumnos y maniobras.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Manage Shifts',
    padre: '/turnos',
    enMenu: false,
  },
  turno: {
    ruta: '/turnos/$id',
    titulo: 'Detalle de turno',
    descripcion: 'Datos del turno y ciclo de la misión por alumno.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    padre: '/turnos',
    enMenu: false,
  },
  modificarTurno: {
    ruta: '/turnos/$id/editar',
    titulo: 'Modificar turno',
    descripcion: 'Cambie los datos, alumnos o maniobras del turno.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Manage Shifts',
    padre: '/turnos/$id',
    enMenu: false,
  },
  hojaDeBriefing: {
    ruta: '/turnos/$id/briefing/$alumno',
    titulo: 'Hoja de briefing',
    descripcion: 'Quién explica cada maniobra en el briefing de detalle.',
    grupo: 'Operaciones de vuelo',
    icono: CalendarClock,
    permiso: 'Read',
    padre: '/turnos/$id',
    enMenu: false,
  },
  registrarEvaluacion: {
    ruta: '/turnos/$id/evaluar/$alumno',
    titulo: 'Registrar evaluación',
    descripcion: 'Califique cada maniobra del turno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Write',
    padre: '/turnos/$id',
    enMenu: false,
  },
  misTurnos: {
    ruta: '/mis-turnos',
    titulo: 'Mis turnos',
    descripcion: 'Sus turnos de vuelo programados.',
    grupo: 'Operaciones de vuelo',
    icono: Plane,
    permiso: 'Read',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
  evaluaciones: {
    ruta: '/evaluaciones',
    titulo: 'Evaluaciones',
    descripcion: 'Evaluaciones prácticas de cada alumno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  evaluacion: {
    ruta: '/evaluaciones/$cod',
    titulo: 'Detalle de evaluación',
    descripcion: 'Calificación de cada maniobra de la evaluación.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Read',
    padre: '/evaluaciones',
    enMenu: false,
  },
  modificarEvaluacion: {
    ruta: '/evaluaciones/$cod/editar',
    titulo: 'Modificar evaluación',
    descripcion: 'Corrija la última evaluación del alumno.',
    grupo: 'Evaluaciones',
    icono: ClipboardList,
    permiso: 'Modify Evaluations',
    padre: '/evaluaciones/$cod',
    enMenu: false,
  },
  misEvaluaciones: {
    ruta: '/mis-evaluaciones',
    titulo: 'Mis evaluaciones',
    descripcion: 'Sus evaluaciones prácticas y su clasificación.',
    grupo: 'Evaluaciones',
    icono: ClipboardCheck,
    permiso: 'Read',
    roles: SOLO_ALUMNO,
    enMenu: true,
  },
  personas: {
    ruta: '/personas',
    titulo: 'Personas',
    descripcion: 'Alumnos, instructores y personal con su cuenta de acceso.',
    grupo: 'Matrícula',
    icono: Users,
    permiso: 'Manage Users',
    enMenu: true,
  },
  registrarPersona: {
    ruta: '/personas/nueva',
    titulo: 'Registrar persona',
    descripcion: 'Registre una persona y la cuenta con la que ingresa.',
    grupo: 'Matrícula',
    icono: UserPlus,
    permiso: 'Manage Users',
    padre: '/personas',
    enMenu: false,
  },
  persona: {
    ruta: '/personas/$cod',
    titulo: 'Detalle de persona',
    descripcion: 'Datos de la persona y de su cuenta.',
    grupo: 'Matrícula',
    icono: UserRound,
    permiso: 'Manage Users',
    padre: '/personas',
    enMenu: false,
  },
  grupos: {
    ruta: '/grupos',
    titulo: 'Grupos',
    descripcion: 'Grupos de alumnos por programa.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    enMenu: true,
  },
  registrarGrupo: {
    ruta: '/grupos/nuevo',
    titulo: 'Registrar grupo',
    descripcion: 'Cree un grupo y asigne sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos',
    enMenu: false,
  },
  grupo: {
    ruta: '/grupos/$id',
    titulo: 'Detalle de grupo',
    descripcion: 'Datos del grupo y sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos',
    enMenu: false,
  },
  modificarGrupo: {
    ruta: '/grupos/$id/editar',
    titulo: 'Modificar grupo',
    descripcion: 'Cambie los datos del grupo y sus alumnos.',
    grupo: 'Matrícula',
    icono: UsersRound,
    permiso: 'Manage Groups',
    padre: '/grupos/$id',
    enMenu: false,
  },
  fases: {
    ruta: '/programa/fases',
    titulo: 'Fases y subfases',
    descripcion: 'Estructura del programa de instrucción.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  registrarFase: {
    ruta: '/programa/fases/nueva',
    titulo: 'Registrar fase',
    descripcion: 'Cree una fase con sus subfases.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Manage Phases',
    padre: '/programa/fases',
    enMenu: false,
  },
  fase: {
    ruta: '/programa/fases/$id',
    titulo: 'Detalle de fase',
    descripcion: 'Subfases de la fase y sus maniobras.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/programa/fases',
    enMenu: false,
  },
  modificarFase: {
    ruta: '/programa/fases/$id/editar',
    titulo: 'Modificar fase',
    descripcion: 'Cambie la fase y sus subfases.',
    grupo: 'Programa',
    icono: Layers,
    permiso: 'Manage Phases',
    padre: '/programa/fases/$id',
    enMenu: false,
  },
  maniobras: {
    ruta: '/programa/maniobras',
    titulo: 'Maniobras',
    descripcion: 'Maniobras del programa y sus estándares.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  registrarManiobra: {
    ruta: '/programa/maniobras/nueva',
    titulo: 'Registrar maniobra',
    descripcion: 'Cree una maniobra y asígnela a sus subfases.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Manage Maneuvers',
    padre: '/programa/maniobras',
    enMenu: false,
  },
  maniobra: {
    ruta: '/programa/maniobras/$id',
    titulo: 'Detalle de maniobra',
    descripcion: 'Subfases y estándares de la maniobra.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Read',
    roles: PERSONAL,
    padre: '/programa/maniobras',
    enMenu: false,
  },
  modificarManiobra: {
    ruta: '/programa/maniobras/$id/editar',
    titulo: 'Modificar maniobra',
    descripcion: 'Cambie la maniobra y sus subfases.',
    grupo: 'Programa',
    icono: Route,
    permiso: 'Manage Maneuvers',
    padre: '/programa/maniobras/$id',
    enMenu: false,
  },
  estandares: {
    ruta: '/programa/maniobras/$id/estandares',
    titulo: 'Estándares de la maniobra',
    descripcion: 'Estándares con los que se califica la maniobra.',
    grupo: 'Programa',
    icono: Ruler,
    permiso: 'Manage Standards',
    padre: '/programa/maniobras/$id',
    enMenu: false,
  },
  materias: {
    ruta: '/programa/materias',
    titulo: 'Materias',
    descripcion: 'Materias del curso en tierra con su nota mínima y coeficiente.',
    grupo: 'Programa',
    icono: BookOpen,
    permiso: 'Read',
    roles: PERSONAL,
    enMenu: true,
  },
  documentos: {
    ruta: '/aprendizaje',
    titulo: 'Documentos',
    descripcion: 'Documentos de estudio con los que generar cuestionarios y hacer consultas.',
    grupo: 'Aprendizaje',
    icono: FileText,
    permiso: 'Read',
    enMenu: true,
  },
  cuestionario: {
    ruta: '/aprendizaje/cuestionario',
    titulo: 'Cuestionario de práctica',
    descripcion: 'Practique con preguntas generadas a partir de sus documentos.',
    grupo: 'Aprendizaje',
    icono: ListChecks,
    permiso: 'Read',
    padre: '/aprendizaje',
    enMenu: true,
  },
  consultas: {
    ruta: '/aprendizaje/consultas',
    titulo: 'Consultas',
    descripcion: 'Pregunte sobre sus documentos y revise las fuentes de cada respuesta.',
    grupo: 'Aprendizaje',
    icono: MessagesSquare,
    permiso: 'Read',
    padre: '/aprendizaje',
    enMenu: true,
  },
} satisfies Record<string, Pantalla>

const TODAS: readonly Pantalla[] = Object.values(PANTALLAS)

export type SeccionMenu = { grupo: GrupoMenu; pantallas: Pantalla[] }

export function pantallaVisible(pantalla: Pantalla, perfil: Perfil, esDesarrollo: boolean) {
  return (
    (!pantalla.soloDesarrollo || esDesarrollo) &&
    puede(perfil.permisos, pantalla.permiso) &&
    (pantalla.roles === undefined || pantalla.roles.includes(perfil.rol.nombre))
  )
}

export function menuPara(perfil: Perfil, esDesarrollo: boolean, pantallas: readonly Pantalla[] = TODAS): SeccionMenu[] {
  const visibles = pantallas.filter((pantalla) => pantalla.enMenu && pantallaVisible(pantalla, perfil, esDesarrollo))
  return ORDEN_GRUPOS.map((grupo) => ({ grupo, pantallas: visibles.filter((pantalla) => pantalla.grupo === grupo) })).filter(
    (seccion) => seccion.pantallas.length > 0,
  )
}

export function accesosPara(perfil: Perfil, esDesarrollo: boolean, pantallas: readonly Pantalla[] = TODAS): Pantalla[] {
  return pantallas.filter(
    (pantalla) => pantalla.ruta !== '/' && !pantalla.ruta.includes('$') && pantallaVisible(pantalla, perfil, esDesarrollo),
  )
}

export function veSoloLoPropio(perfil: Perfil): boolean {
  return perfil.rol.nombre === 'Alumno'
}

export function pantallaPorRuta(ruta: string, pantallas: readonly Pantalla[] = TODAS): Pantalla | undefined {
  return pantallas.find((pantalla) => pantalla.ruta === ruta)
}

export function migasPara(
  ruta: string,
  perfil: Perfil,
  esDesarrollo: boolean,
  pantallas: readonly Pantalla[] = TODAS,
): Pantalla[] {
  const actual = pantallaPorRuta(ruta, pantallas)
  if (!actual || actual.ruta === '/') return []
  const ancestros: Pantalla[] = []
  let padre = actual.padre ? pantallaPorRuta(actual.padre, pantallas) : undefined
  while (padre) {
    if (pantallaVisible(padre, perfil, esDesarrollo)) ancestros.unshift(padre)
    padre = padre.padre ? pantallaPorRuta(padre.padre, pantallas) : undefined
  }
  return [...ancestros, actual]
}
