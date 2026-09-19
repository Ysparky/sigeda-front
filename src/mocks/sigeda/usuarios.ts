export type UsuarioMock = {
  id: number
  username: string
  correo: string
  codPersona: string
  rol: { id: number; nombre: string; descripcion: string }
}

export const CONTRASENA_SEED = '123'

export const USUARIOS_MOCK: Record<string, UsuarioMock> = {
  'jefe.operaciones': {
    id: 1,
    username: 'jefe.operaciones',
    correo: 'jefeoperaciones@sigeda.com',
    codPersona: '333333',
    rol: { id: 3, nombre: 'Jefe de Operaciones', descripcion: 'Supervisión de operaciones y gestión de programas' },
  },
  'instructor.perez': {
    id: 2,
    username: 'instructor.perez',
    correo: 'instructor@sigeda.com',
    codPersona: '444444',
    rol: { id: 4, nombre: 'Instructor', descripcion: 'Evaluación y seguimiento de alumnos' },
  },
  'alumno.lopez': {
    id: 3,
    username: 'alumno.lopez',
    correo: 'alumno1@sigeda.com',
    codPersona: '111111',
    rol: { id: 1, nombre: 'Alumno', descripcion: 'Usuario en entrenamiento con acceso a evaluaciones y reportes personales' },
  },
  'admin.sistema': {
    id: 10,
    username: 'admin.sistema',
    correo: 'admin@sigeda.com',
    codPersona: '000001',
    rol: { id: 2, nombre: 'Administrador Web', descripcion: 'Control total del sistema y gestión de usuarios' },
  },
  'comandante.aguirre': {
    id: 11,
    username: 'comandante.aguirre',
    correo: 'comandante@sigeda.com',
    codPersona: '222444',
    rol: { id: 5, nombre: 'Comandante de Escuadrón', descripcion: 'Gestión de grupos y supervisión de instructores' },
  },
}
