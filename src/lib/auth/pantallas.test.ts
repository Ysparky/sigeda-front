import { House } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { permisosDeRol } from './permisos'
import { accesosPara, menuPara, type Pantalla, type RutaApp } from './pantallas'

const ruta = (valor: string) => valor as RutaApp

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

describe('menuPara', () => {
  it('CA-SES-04 oculta del menú lo que el rol no puede ver', () => {
    expect(menuPara(permisosDeRol('Alumno'), false, todas)).toEqual([{ grupo: 'General', pantallas: [inicio] }])
    expect(menuPara(permisosDeRol('Administrador Web'), false, todas)).toEqual([
      { grupo: 'General', pantallas: [inicio] },
      { grupo: 'Matrícula', pantallas: [usuarios] },
    ])
  })

  it('muestra las pantallas de desarrollo solo en desarrollo', () => {
    expect(menuPara(permisosDeRol('Alumno'), true, todas)[0]?.pantallas).toEqual([inicio, guia])
  })
})

describe('accesosPara', () => {
  it('excluye Inicio e incluye pantallas permitidas fuera del menú', () => {
    expect(accesosPara(permisosDeRol('Alumno'), false, todas)).toEqual([cuenta])
  })
})
