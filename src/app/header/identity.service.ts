import { Injectable } from '@angular/core';
import { Usuario, Usuario_Rol, Rol, Permiso } from "./identity";
import { jsonUsuarios, jsonRolesUsuario, jsonRoles, jsonPermisos } from "./identity.json";

@Injectable()
export class IdentityService {

  rolesUsuario: Usuario_Rol[] = [];

  constructor() { }

  getUsuarioEnSesion(id: number): Usuario {
    console.log(jsonUsuarios[id]);
    return jsonUsuarios[id];
  }

  idRoles: number[] = [];
  idRolesAux: number[] = [];
  getIdRoles(id: number): number[] {
    //Roles del usuario con idUsuario
    this.rolesUsuario = jsonUsuarios[id].usuario_rol;
    //iterar lista de roles con idUsuario y guardar idRoles
    this.rolesUsuario.forEach(roles => {
      this.idRolesAux.push(roles.idRol)
    });

    //limpiamos para evitar data duplicada por push
    this.idRoles = this.idRolesAux;
    this.idRolesAux = [];
    
    console.log(this.idRoles);
    return this.idRoles;
  }
  
  idRol: number = 0;
  getIdRol(id: number): number {
    //iterar roles con idUsuario y guardar ultimo idRol
    this.getIdRoles(id).forEach(idRoles => {
      this.idRol = idRoles
    });  

    console.log(this.idRol);
    return this.idRol;
  }

  index: number = 0;
  getRolUsuario(id: number): Rol {
    this.index = this.getIdRol(id) - 1;

    console.log(jsonRoles[this.index]);
    return jsonRoles[this.index];
  }

  permisos: Permiso[] = [];
  permisosAux: Permiso[] = [];
  getPermisosUsuario(id: number): Permiso[] {
    //obtener roles con idRoles
    //iterar permisos con idRol y guardarlos
    this.getIdRoles(id).forEach(idRol => {
      this.permisosAux = this.permisosAux.concat(jsonRoles[idRol - 1].permiso)
    });

    //limpiamos para evitar data duplicada por push
    this.permisos = this.permisosAux;
    this.permisosAux = [];

    console.log(this.permisos);
    return this.permisos;
  }

  permisosEnSidebar: Permiso[] = [];
  getPermisosEnSideBar(id: number): Permiso[] {
    this.getPermisosUsuario(id).forEach(permiso => {
      if (permiso.enSidebar == true) {
        this.permisosEnSidebar.push(permiso);        
      }
    });
    
    //usar variable aux
    //limpiar permisosEnSidebar por data duplicada

    console.log(this.permisosEnSidebar)
    return this.permisosEnSidebar;
  }
}