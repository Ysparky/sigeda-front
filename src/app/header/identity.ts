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
    rol_permiso: Rol_Permiso[];

    constructor() {
        this.id = 0;
        this.nombre = '';
        this.rol_permiso = [];
    }    
}

export class Permiso {
    id: number;
    nombre: string;
    descripcion: string;

    constructor() {
        this.id = 0;
        this.nombre = '';
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

export class Rol_Permiso {
    idRol: number;
    idPermiso: number;
    permiso: Permiso;

    constructor() {
        this.idRol = 0;
        this.idPermiso = 0;
        this.permiso = new Permiso();
    }
}