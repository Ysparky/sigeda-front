export type RolMock = { id: number; nombre: string; descripcion: string }

export type UsuarioMock = {
  id: number
  username: string
  correo: string
  codPersona: string
  idRol: number | null
  password: string
}

export const CONTRASENA_SEED = '123'

export const ROLES_MOCK: RolMock[] = [
  { id: 1, nombre: 'Alumno', descripcion: 'Usuario en entrenamiento con acceso a evaluaciones y reportes personales' },
  { id: 2, nombre: 'Administrador Web', descripcion: 'Control total del sistema y gestión de usuarios' },
  { id: 3, nombre: 'Jefe de Operaciones', descripcion: 'Supervisión de operaciones y gestión de programas' },
  { id: 4, nombre: 'Instructor', descripcion: 'Evaluación y seguimiento de alumnos' },
  { id: 5, nombre: 'Comandante de Escuadrón', descripcion: 'Gestión de grupos y supervisión de instructores' },
]

function usuario(id: number, username: string, correo: string, codPersona: string, idRol: number | null): UsuarioMock {
  return { id, username, correo, codPersona, idRol, password: CONTRASENA_SEED }
}

export function crearUsuarios(): UsuarioMock[] {
  return [
    usuario(1, 'jefe.operaciones', 'jefeoperaciones@sigeda.com', '333333', 3),
    usuario(2, 'instructor.perez', 'instructor@sigeda.com', '444444', 4),
    usuario(3, 'alumno.lopez', 'alumno1@sigeda.com', '111111', 1),
    usuario(4, 'alumno.falconi', 'alumno2@sigeda.com', '222222', 1),
    usuario(5, 'alumno.garcia', 'alumno3@sigeda.com', '555555', 1),
    usuario(6, 'alumno.torres', 'alumno4@sigeda.com', '666666', 1),
    usuario(7, 'alumno.ramirez', 'alumno5@sigeda.com', '777777', 1),
    usuario(8, 'instructor.mendoza', 'instructor2@sigeda.com', '888888', 4),
    usuario(9, 'alumno.castro', 'alumno6@sigeda.com', '999999', 1),
    usuario(10, 'admin.sistema', 'admin@sigeda.com', '000001', 2),
    usuario(11, 'comandante.aguirre', 'comandante@sigeda.com', '222444', 5),
    usuario(12, 'raul.paredes', 'raul.paredes@sigeda.com', '765432', null),
  ]
}
