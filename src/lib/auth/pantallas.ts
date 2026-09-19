import { House, KeyRound, Palette, type LucideIcon } from 'lucide-react'
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

export type Pantalla = {
  ruta: RutaApp
  titulo: string
  descripcion: string
  grupo: GrupoMenu
  icono: LucideIcon
  permiso?: Permiso
  enMenu: boolean
  soloDesarrollo?: boolean
}

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
} satisfies Record<string, Pantalla>

const TODAS: readonly Pantalla[] = Object.values(PANTALLAS)

export type SeccionMenu = { grupo: GrupoMenu; pantallas: Pantalla[] }

export function pantallaVisible(pantalla: Pantalla, permisos: ReadonlySet<Permiso>, esDesarrollo: boolean) {
  return (!pantalla.soloDesarrollo || esDesarrollo) && puede(permisos, pantalla.permiso)
}

export function menuPara(
  permisos: ReadonlySet<Permiso>,
  esDesarrollo: boolean,
  pantallas: readonly Pantalla[] = TODAS,
): SeccionMenu[] {
  const visibles = pantallas.filter((pantalla) => pantalla.enMenu && pantallaVisible(pantalla, permisos, esDesarrollo))
  return ORDEN_GRUPOS.map((grupo) => ({ grupo, pantallas: visibles.filter((pantalla) => pantalla.grupo === grupo) })).filter(
    (seccion) => seccion.pantallas.length > 0,
  )
}

export function accesosPara(
  permisos: ReadonlySet<Permiso>,
  esDesarrollo: boolean,
  pantallas: readonly Pantalla[] = TODAS,
): Pantalla[] {
  return pantallas.filter((pantalla) => pantalla.ruta !== '/' && pantallaVisible(pantalla, permisos, esDesarrollo))
}
