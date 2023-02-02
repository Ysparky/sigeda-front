export class Usuario {
    id: number;
    nombre: string;
    correo: string;
    contraseña: string;
    usuario_rol: Usuario_Rol[];

    constructor() {
        this.id = 0;
        this.nombre = '';
        this.correo = '';
        this.contraseña = '';
        this.usuario_rol = [];
    }
}

export class Rol {
    id: number;
    nombre: string;
    permiso: Permiso[];

    constructor() {
        this.id = 0;
        this.nombre = '';
        this.permiso = [];
    }    
}

export class Permiso {
    id: number;
    nombre: string;
    enSidebar: boolean;
    descripcion: string;

    constructor() {
        this.id = 0;
        this.nombre = '';
        this.enSidebar = false;
        this.descripcion = '';
    }
}

export class Usuario_Rol {
    idUsuario: number;
    idRol: number;
    rol: Rol;

    constructor() {
        this.idUsuario = 0;
        this.idRol = 0;      
        this.rol = new Rol();
    }
}