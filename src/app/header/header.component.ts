import { ThisReceiver } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { Usuario, Usuario_Rol, Rol, Permiso } from "../shared/identity";
import { IdentityService } from '../shared/identity.service';

@Component({
    selector: 'app-header', 
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

    usuario: Usuario = new Usuario(); 
    permisosEnSideBar: Permiso[] = [];

    constructor(private identityService: IdentityService) {
    }

    ngOnInit() {
        //0:Jefe Operaciones, 1:Instructor, 2:Jefe, 3:Cmdre, 4:Alumno
        this.usuario = this.identityService.getUsuarioEnSesion(3);
        this.permisosEnSideBar = this.identityService.getPermisosEnSideBar(3);
    }
}