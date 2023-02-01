import { Component, OnInit } from '@angular/core';
import { Usuario, Usuario_Rol, Rol, Rol_Permiso, Permiso } from "./identity";
import { IdentityService } from './identity.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

    usuario: Usuario = new Usuario(); 
    permisos: Permiso[] = [];

    constructor(private identityService: IdentityService) {
    }

    ngOnInit() {
        //0:Jefe Operaciones, 1:Instructor, 2:Jefe, 3:Cmdre, 4:Alumno
        this.usuario = this.identityService.getUsuarioEnSesion(3);
        this.permisos = this.identityService.getPermisosUsuario(3);
    }
}