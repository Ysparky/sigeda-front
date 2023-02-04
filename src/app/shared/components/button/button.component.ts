import {
  Component,
  Input,
  OnInit,
  forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ButtonComponent),
      multi: true,
    },
  ],
})
export class ButtonComponent implements ControlValueAccessor, OnInit {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  @Input() color: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 = 0;
  @Input() eventClass: string = '';

  icon?:string ='';

  onClicked: any = () => {};

  constructor(
  ) {}

  ngOnInit(): void {
    this.getColor();
  }

  writeValue(obj: any): void {
    null;
  }
  registerOnChange(fn: any): void {
    null;
  }
  registerOnTouched(fn: any): void {
    null;
  }
  setDisabledState?(isDisabled: boolean): void {
    null;
  }

  onClick(event: Event): void {

  }

  getColor(): string {
    let value = '';
    switch (this.color) {
      case 1: // Eliminar - Rojo
        value = '#EC1818';
        this.icon ='bi bi-trash';
        return value;
      case 2: // Modificar - Naranja
        value = '#FFAF33';
        this.icon ='bi bi-pencil';
        return value;
      case 3: // Busqueda - Verde Agua
        value = '#1CA6BB';
        this.icon ='bi bi-search';
        return value;
      case 4: // Success - Verde
        value = '#13BF4C';
        this.icon ='bi bi-check2';
        return value;
      case 5: // Enviar - Naranja Oscuro
        value = '#E87930';
        this.icon ='bi bi-cursor';
        return value;
      case 6: // Atras - Plomo
        value = '#A8ADB2';
        this.icon ='bi bi-arrow-counterclockwise';
        return value;
      case 7: // Agregar - Verde Oscuro
        value = '#066D8C';
        this.icon ='bi bi-plus';
        return value;
      case 8: // Reporte - Verde Jade
        value = '#0D8C7A';
        this.icon ='bi bi-clipboard-data';
        return value;
      case 9: // Submit - Azul Oscuro
        value = '#2F80ED';
        this.icon ='bi bi-send';
        return value;
      case 10: // Subir Archivos - Caqui
        value = '#809068';
        this.icon ='bi bi-upload';
        return value;
      case 11: // Vista
        value = '#2DC7DD';
        this.icon ='bi bi-eye';
        return value;
      default: // Global - Azul Oscuro
        value = '#2F80ED';
        this.icon ='bi bi-back';
        return value;
    }
  }
}
