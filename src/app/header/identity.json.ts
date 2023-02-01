import { Usuario, Usuario_Rol, Rol, Rol_Permiso, Permiso } from "./identity";

export const jsonPermisos: Permiso[] = [
    { id: 1, nombre: 'Consultar Reporte Notas', descripcion: 'Alumno: Notas específicas del alumno. Instructores: Notas de alumnos. Generar reportes  teórico y práctico.' },
    { id: 2, nombre: 'Gestionar Usuarios', descripcion: 'CRUD Usuarios y Asignar Roles.' },
    { id: 3, nombre: 'Gestionar Roles', descripcion: 'CRUD Roles y Asignar Permisos.' },
    { id: 4, nombre: 'Registrar Turnos', descripcion: 'Registrar y actualizar programación de turnos.' },
    { id: 5, nombre: 'Gestionar Estándares', descripcion: 'CRUD Estándares y Asignarlos a maniobras.' },
    { id: 6, nombre: 'Registrar Material', descripcion: 'Subir y eliminar material de estudio.' },
    { id: 7, nombre: 'Registrar Calificación Práctica', descripcion: 'Registrar Calificaciones en Reporte.' },
    { id: 8, nombre: 'Firmar Reporte Evaluación', descripcion: 'Firmar Reportes Evaluados.' },
    { id: 9, nombre: 'Consultar Material', descripcion: 'Ver materiales del curso filtrados por semana.' },
    { id: 10, nombre: 'Registrar Práctica Teórica', descripcion: 'Registrar respuestas en Reporte.' },
    { id: 11, nombre: 'Registrar Conformidad', descripcion: 'Registrar conformidad en Reportes Evaluados.' },
    { id: 12, nombre: 'Registrar Formato Riesgos', descripcion: 'Registrar formulario de riesgos.' },
    { id: 13, nombre: 'Registrar Apreciación Psicológica', descripcion: 'Registrar documento de la evaluación.' },
    { id: 14, nombre: 'Gestionar Pregunta', descripcion: 'CRUD Preguntas.' },
    { id: 15, nombre: 'Registrar Práctica Teórica', descripcion: 'Registrar datos generales de práctica y asignar preguntas.' },
    { id: 16, nombre: 'Aprobar Revisión', descripcion: 'Confirmar o rechazar revisión de la evaluación por el instructor.' },
    { id: 17, nombre: 'Registrar Reporte Teórico', descripcion: 'Registrar documento de práctica teórica en el sistema.' },
    { id: 18, nombre: 'Registrar Reporte Práctico', descripcion: 'Registrar documento de evaluación práctica en el sistema.' },
    { id: 19, nombre: 'Gestionar Módulo', descripcion: 'CRUD Módulos.' },
    { id: 20, nombre: 'Modificar Calificación', descripcion: 'Modifica reporte rechazado por el jefe de instrucción.' },
    { id: 21, nombre: 'Registrar Memorandum', descripcion: 'Registrar memorandum por clasificación de vuelo regular o mala.' }
]

export const jsonPermisosRol: Rol_Permiso[] = [
    { idRol: 1, idPermiso: 1, permiso: jsonPermisos[0] },
    { idRol: 2, idPermiso: 2, permiso: jsonPermisos[1] },
    { idRol: 2, idPermiso: 3, permiso: jsonPermisos[2] },
    { idRol: 3, idPermiso: 4, permiso: jsonPermisos[3] },
    { idRol: 3, idPermiso: 5, permiso: jsonPermisos[4] },
    { idRol: 4, idPermiso: 6, permiso: jsonPermisos[5] },
    { idRol: 4, idPermiso: 7, permiso: jsonPermisos[6] },
    { idRol: 4, idPermiso: 8, permiso: jsonPermisos[7] },
    { idRol: 5, idPermiso: 9, permiso: jsonPermisos[8] },
    { idRol: 5, idPermiso: 10, permiso: jsonPermisos[9] },
    { idRol: 5, idPermiso: 11, permiso: jsonPermisos[10] },
    { idRol: 5, idPermiso: 12, permiso: jsonPermisos[11] },
    { idRol: 6, idPermiso: 13, permiso: jsonPermisos[12] },
    { idRol: 7, idPermiso: 14, permiso: jsonPermisos[13] },
    { idRol: 7, idPermiso: 15, permiso: jsonPermisos[14] },
    { idRol: 7, idPermiso: 16, permiso: jsonPermisos[15] },
    { idRol: 7, idPermiso: 17, permiso: jsonPermisos[16] },
    { idRol: 8, idPermiso: 18, permiso: jsonPermisos[17] },
    { idRol: 8, idPermiso: 19, permiso: jsonPermisos[18] },
    { idRol: 8, idPermiso: 20, permiso: jsonPermisos[19] },
    { idRol: 8, idPermiso: 21, permiso: jsonPermisos[20] }
]

export const jsonRoles: Rol[] = [
    { id: 1, nombre: 'Usuario', rol_permiso: [ jsonPermisosRol[0] ] },
    { id: 2, nombre: 'Administrador Web', rol_permiso: [ jsonPermisosRol[1], jsonPermisosRol[2] ] },
    { id: 3, nombre: 'Jefe de Operaciones', rol_permiso: [ jsonPermisosRol[3], jsonPermisosRol[4] ] },
    { id: 4, nombre: 'Instructor', rol_permiso: [ jsonPermisosRol[5], jsonPermisosRol[6], jsonPermisosRol[7] ] },
    { id: 5, nombre: 'Alumno', rol_permiso: [ jsonPermisosRol[8], jsonPermisosRol[9], jsonPermisosRol[10], jsonPermisosRol[11] ] },
    { id: 6, nombre: 'Sanidad', rol_permiso: [ jsonPermisosRol[12] ] },
    { id: 7, nombre: 'Jefe de Instrucción', rol_permiso: [ jsonPermisosRol[13], jsonPermisosRol[14], jsonPermisosRol[15], jsonPermisosRol[16] ] },
    { id: 8, nombre: 'Comandante Escuadrón', rol_permiso: [ jsonPermisosRol[17], jsonPermisosRol[18], jsonPermisosRol[19], jsonPermisosRol[20] ] }
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