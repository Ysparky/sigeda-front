import { Usuario, Usuario_Rol, Rol, Permiso } from "./identity";

export const jsonPermisos: Permiso[] = [
    { id: 1, nombre: 'Consultar Reporte Notas', enSidebar: true, descripcion: 'Alumno: Notas específicas del alumno. Instructores: Notas de alumnos. Generar reportes  teórico y práctico.' },
    { id: 2, nombre: 'Gestionar Usuarios', enSidebar: true, descripcion: 'CRUD Usuarios y Asignar Roles.' },
    { id: 3, nombre: 'Gestionar Roles', enSidebar: true, descripcion: 'CRUD Roles y Asignar Permisos.' },
    { id: 4, nombre: 'Registrar Turnos', enSidebar: true, descripcion: 'Registrar y actualizar programación de turnos.' },
    { id: 5, nombre: 'Gestionar Estándares', enSidebar: true, descripcion: 'CRUD Estándares y Asignarlos a maniobras.' },
    { id: 6, nombre: 'Registrar Material', enSidebar: false, descripcion: 'Subir y eliminar material de estudio.' },
    { id: 7, nombre: 'Registrar Calificación Práctica', enSidebar: false, descripcion: 'Registrar Calificaciones en Reporte.' },
    { id: 8, nombre: 'Firmar Reporte Evaluación', enSidebar: false, descripcion: 'Firmar Reportes Evaluados.' },
    { id: 9, nombre: 'Consultar Material', enSidebar: false, descripcion: 'Ver materiales del curso filtrados por semana.' },
    { id: 10, nombre: 'Registrar Práctica Teórica', enSidebar: false, descripcion: 'Registrar respuestas en Reporte.' },
    { id: 11, nombre: 'Registrar Conformidad', enSidebar: false, descripcion: 'Registrar conformidad en Reportes Evaluados.' },
    { id: 12, nombre: 'Registrar Formato Riesgos', enSidebar: true, descripcion: 'Registrar formulario de riesgos.' },
    { id: 13, nombre: 'Registrar Apreciación Psicológica', enSidebar: true, descripcion: 'Registrar documento de la evaluación.' },
    { id: 14, nombre: 'Gestionar Preguntas', enSidebar: true, descripcion: 'CRUD Preguntas.' },
    { id: 15, nombre: 'Registrar Práctica Teórica', enSidebar: true, descripcion: 'Registrar datos generales de práctica y asignar preguntas.' },
    { id: 16, nombre: 'Aprobar Revisión', enSidebar: false, descripcion: 'Confirmar o rechazar revisión de la evaluación por el instructor.' },
    { id: 17, nombre: 'Registrar Reporte Teórico', enSidebar: false, descripcion: 'Registrar documento de práctica teórica en el sistema.' },
    { id: 18, nombre: 'Registrar Reporte Práctico', enSidebar: false, descripcion: 'Registrar documento de evaluación práctica en el sistema.' },
    { id: 19, nombre: 'Gestionar Módulos', enSidebar: true, descripcion: 'CRUD Módulos.' },
    { id: 20, nombre: 'Modificar Calificación', enSidebar: false, descripcion: 'Modifica reporte rechazado por el jefe de instrucción.' },
    { id: 21, nombre: 'Registrar Memorandum', enSidebar: false, descripcion: 'Registrar memorandum por clasificación de vuelo regular o mala.' }
]

export const jsonRoles: Rol[] = [
    { id: 1, nombre: 'Usuario', permiso: [ jsonPermisos[0] ] },
    { id: 2, nombre: 'Administrador Web', permiso: [ jsonPermisos[1], jsonPermisos[2] ] },
    { id: 3, nombre: 'Jefe de Operaciones', permiso: [ jsonPermisos[3], jsonPermisos[4] ] },
    { id: 4, nombre: 'Instructor', permiso: [ jsonPermisos[5], jsonPermisos[6], jsonPermisos[7] ] },
    { id: 5, nombre: 'Alumno', permiso: [ jsonPermisos[8], jsonPermisos[9], jsonPermisos[10], jsonPermisos[11] ] },
    { id: 6, nombre: 'Sanidad', permiso: [ jsonPermisos[12] ] },
    { id: 7, nombre: 'Jefe de Instrucción', permiso: [ jsonPermisos[13], jsonPermisos[14], jsonPermisos[15], jsonPermisos[16] ] },
    { id: 8, nombre: 'Comandante Escuadrón', permiso: [ jsonPermisos[17], jsonPermisos[18], jsonPermisos[19], jsonPermisos[20] ] }
]

export const jsonRolesUsuario: Usuario_Rol[] = [
    { idUsuario: 1, idRol: 1, rol: jsonRoles[0] },
    { idUsuario: 1, idRol: 3, rol: jsonRoles[2] },
    { idUsuario: 2, idRol: 1, rol: jsonRoles[0] },
    { idUsuario: 2, idRol: 4, rol: jsonRoles[3] },
    { idUsuario: 3, idRol: 1, rol: jsonRoles[0] },
    { idUsuario: 3, idRol: 4, rol: jsonRoles[3] },
    { idUsuario: 3, idRol: 7, rol: jsonRoles[6] },
    { idUsuario: 4, idRol: 1, rol: jsonRoles[0] },
    { idUsuario: 4, idRol: 4, rol: jsonRoles[3] },
    { idUsuario: 4, idRol: 7, rol: jsonRoles[6] },
    { idUsuario: 4, idRol: 8, rol: jsonRoles[7] },
    { idUsuario: 5, idRol: 1, rol: jsonRoles[0] },
    { idUsuario: 5, idRol: 5, rol: jsonRoles[4] }
]//faltan 4 rolesUsuario

export const jsonUsuarios: Usuario[] = [
    { id: 1, nombre: 'Jefe de Operaciones', correo: 'jefeoperaciones@sigeda.com', contraseña: '123', usuario_rol: [ jsonRolesUsuario[0], jsonRolesUsuario[1] ] },
    { id: 2, nombre: 'Instructor', correo: 'instructor@sigeda.com', contraseña: '123', usuario_rol: [ jsonRolesUsuario[2], jsonRolesUsuario[3] ] },
    { id: 3, nombre: 'Jefe de Instrucción', correo: 'jefeinstruccion@sigeda.com', contraseña: '123', usuario_rol: [ jsonRolesUsuario[4], jsonRolesUsuario[5], jsonRolesUsuario[6] ] },
    { id: 4, nombre: 'Comandante de Escuadrón', correo: 'cmdtescuadron@sigeda.com', contraseña: '123', usuario_rol: [ jsonRolesUsuario[7], jsonRolesUsuario[8], jsonRolesUsuario[9], jsonRolesUsuario[10] ] },
    { id: 5, nombre: 'Alumno', correo: 'alumno@sigeda.com', contraseña: '123', usuario_rol: [ jsonRolesUsuario[11], jsonRolesUsuario[12] ] }
]//faltan 2 usuario