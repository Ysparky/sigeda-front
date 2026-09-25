import { House } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { permisosDeRol } from './permisos'
import {
  accesosPara,
  menuPara,
  migasPara,
  PANTALLAS,
  veSoloLoPropio,
  type Pantalla,
  type Perfil,
  type RutaApp,
} from './pantallas'

const ruta = (valor: string) => valor as RutaApp

function perfilDe(rol: string): Perfil {
  return { permisos: permisosDeRol(rol), rol: { nombre: rol } }
}

const inicio: Pantalla = { ruta: ruta('/'), titulo: 'Inicio', descripcion: '', grupo: 'General', icono: House, enMenu: true }
const usuarios: Pantalla = {
  ruta: ruta('/usuarios'),
  titulo: 'Usuarios',
  descripcion: '',
  grupo: 'Matrícula',
  icono: House,
  permiso: 'Manage Roles',
  enMenu: true,
}
const guia: Pantalla = {
  ruta: ruta('/guia'),
  titulo: 'Guía',
  descripcion: '',
  grupo: 'General',
  icono: House,
  enMenu: true,
  soloDesarrollo: true,
}
const cuenta: Pantalla = {
  ruta: ruta('/cuenta'),
  titulo: 'Cuenta',
  descripcion: '',
  grupo: 'General',
  icono: House,
  permiso: 'Update',
  enMenu: false,
}
const todas = [inicio, usuarios, guia, cuenta]

function titulosDelMenu(rol: string) {
  return menuPara(perfilDe(rol), false).flatMap((seccion) => seccion.pantallas.map((pantalla) => pantalla.titulo))
}

describe('menuPara', () => {
  it('CA-SES-04 oculta del menú lo que el rol no puede ver', () => {
    expect(menuPara(perfilDe('Alumno'), false, todas)).toEqual([{ grupo: 'General', pantallas: [inicio] }])
    expect(menuPara(perfilDe('Administrador Web'), false, todas)).toEqual([
      { grupo: 'General', pantallas: [inicio] },
      { grupo: 'Matrícula', pantallas: [usuarios] },
    ])
  })

  it('muestra las pantallas de desarrollo solo en desarrollo', () => {
    expect(menuPara(perfilDe('Alumno'), true, todas)[0]?.pantallas).toEqual([inicio, guia])
  })

  it('CA-TUR-14 el alumno ve Mis turnos y Mis evaluaciones, no la programación general', () => {
    expect(titulosDelMenu('Alumno')).toEqual([
      'Inicio',
      'Mis turnos',
      'Mis evaluaciones',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
  })

  it('el personal ve la programación de turnos, la orden de vuelo y las evaluaciones', () => {
    expect(titulosDelMenu('Instructor')).toEqual([
      'Inicio',
      'Fases y subfases',
      'Maniobras',
      'Materias',
      'Programación de turnos',
      'Orden de vuelo del día',
      'Evaluaciones',
      'Documentos',
      'Cuestionario de práctica',
      'Consultas',
    ])
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Programación de turnos')
  })

  it('CA-PER-11 y CA-GRU-01 Matrícula se reparte entre el administrador y el jefe de operaciones', () => {
    expect(titulosDelMenu('Administrador Web')).toContain('Personas')
    expect(titulosDelMenu('Administrador Web')).toContain('Grupos')
    expect(titulosDelMenu('Jefe de Operaciones')).toContain('Grupos')
    expect(titulosDelMenu('Jefe de Operaciones')).not.toContain('Personas')
    expect(titulosDelMenu('Comandante de Escuadrón')).not.toContain('Grupos')
    expect(titulosDelMenu('Alumno')).not.toContain('Fases y subfases')
  })

  it('M2-12 el menú agrupa las pantallas de M2 en Matrícula y Programa', () => {
    const secciones = menuPara(perfilDe('Administrador Web'), false)
    expect(secciones.map((seccion) => seccion.grupo)).toEqual([
      'General',
      'Matrícula',
      'Programa',
      'Operaciones de vuelo',
      'Evaluaciones',
      'Aprendizaje',
    ])
    expect(secciones[2]?.pantallas.map((pantalla) => pantalla.titulo)).toEqual([
      'Fases y subfases',
      'Maniobras',
      'Materias',
    ])
  })
})

describe('accesosPara', () => {
  it('excluye Inicio e incluye pantallas permitidas fuera del menú', () => {
    expect(accesosPara(perfilDe('Alumno'), false, todas)).toEqual([cuenta])
  })

  it('no ofrece accesos a pantallas que necesitan parámetros', () => {
    const rutas = accesosPara(perfilDe('Administrador Web'), false).map((pantalla) => pantalla.ruta)
    expect(rutas).toContain('/turnos/nuevo')
    expect(rutas.some((valor) => valor.includes('$'))).toBe(false)
  })
})

describe('migasPara', () => {
  it('M1-12 arma la cadena desde la sección hasta la pantalla actual', () => {
    expect(migasPara('/turnos/$id/briefing/$alumno', perfilDe('Jefe de Operaciones'), false)).toEqual([
      PANTALLAS.turnos,
      PANTALLAS.turno,
      PANTALLAS.hojaDeBriefing,
    ])
  })

  it('M1-12 omite las secciones que el rol no puede abrir', () => {
    expect(migasPara('/turnos/$id', perfilDe('Alumno'), false)).toEqual([PANTALLAS.turno])
  })

  it('M2-12 arma las migas de las pantallas de matrícula y programa', () => {
    expect(migasPara('/personas/$cod', perfilDe('Administrador Web'), false)).toEqual([
      PANTALLAS.personas,
      PANTALLAS.persona,
    ])
    expect(migasPara('/programa/maniobras/$id/estandares', perfilDe('Jefe de Operaciones'), false)).toEqual([
      PANTALLAS.maniobras,
      PANTALLAS.maniobra,
      PANTALLAS.estandares,
    ])
  })

  it('M3-13 el cuestionario y las consultas cuelgan de Documentos', () => {
    expect(migasPara('/aprendizaje/cuestionario', perfilDe('Alumno'), false)).toEqual([
      PANTALLAS.documentos,
      PANTALLAS.cuestionario,
    ])
    expect(migasPara('/aprendizaje/consultas', perfilDe('Comandante de Escuadrón'), false)).toEqual([
      PANTALLAS.documentos,
      PANTALLAS.consultas,
    ])
    expect(migasPara('/aprendizaje', perfilDe('Instructor'), false)).toEqual([PANTALLAS.documentos])
  })

  it('no agrega migas en Inicio ni en rutas desconocidas', () => {
    expect(migasPara('/', perfilDe('Alumno'), false)).toEqual([])
    expect(migasPara('/no-existe', perfilDe('Alumno'), false)).toEqual([])
  })
})

describe('veSoloLoPropio', () => {
  it('CA-TUR-14 y CA-EVA-10 restringe al alumno a sus propios datos', () => {
    expect(veSoloLoPropio(perfilDe('Alumno'))).toBe(true)
    expect(veSoloLoPropio(perfilDe('Instructor'))).toBe(false)
  })
})
