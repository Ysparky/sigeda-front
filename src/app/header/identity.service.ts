import { Injectable } from '@angular/core';
import { Usuario, Usuario_Rol, Rol, Rol_Permiso, Permiso } from "./identity";
import { jsonUsuarios, jsonRolesUsuario, jsonRoles, jsonPermisosRol, jsonPermisos } from "./identity.json";

@Injectable()
export class IdentityService {

  usuarios: Usuario[] = [];
  roles: Rol[] = [];
  permisos: Permiso[] = [];
  rolesUsuario: Usuario_Rol[] = [];
  permisosRol: Rol_Permiso[] = [];

  constructor() { }

  getUsuarioEnSesion(id: number): Usuario {
    console.log(jsonUsuarios[id]);
    return jsonUsuarios[id];
  }

  getRolesUsuario(id: number): Rol[] {
    //Roles del usuario con idUsuario
    this.rolesUsuario = jsonUsuarios[id].usuario_rol;

    //iterar lista de roles con idUsuario y guardar idRoles
    this.rolesUsuario.forEach(roles => {
      this.idRoles.push(roles.idRol)
    });
    //console.log(this.idRoles)

    //obtener roles con idRoles
    //iterar lista de permisos con idRol y concatenar permisos
    this.idRoles.forEach(idRol => {
      this.roles.push(jsonRoles[idRol]); 
    });
    console.log(this.roles);
    
    return this.roles;
  }

  idRoles: number[] = [];
  idPermisos: number[] = [];
  getPermisosUsuario(id: number): Permiso[] {
    //Roles del usuario con idUsuario
    this.rolesUsuario = jsonUsuarios[id].usuario_rol;

    //iterar lista de roles con idUsuario y guardar idRoles
    this.rolesUsuario.forEach(roles => {
      this.idRoles.push(roles.idRol)
    });
    console.log(this.idRoles)

    //obtener roles con idRoles
    //iterar lista de permisos con idRol y concatenar permisos
    this.idRoles.forEach(idRol => {
      this.permisosRol = this.permisosRol.concat(jsonRoles[idRol - 1].rol_permiso);
    });
    console.log(this.permisosRol);

    //iterar lista de permisos y guardar idPermisos
    this.permisosRol.forEach(permisos => {
      this.idPermisos.push(permisos.idPermiso)
    });
    console.log(this.idPermisos)

    //obtener permisos con idPermisos y guardar 
    this.idPermisos.forEach(idPermiso => {
      this.permisos.push(jsonPermisos[idPermiso-1])
    })
    console.log(this.permisos)

    return this.permisos;
  }
}
