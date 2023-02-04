import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageInstructionService {
  public TIPO_INSTRUCCION = 'tipoInstruccion';
  private tipoIntruccionChange$: Subject<string> = new Subject<string>();
  private mostrarFragmentoVistaChange$: Subject<boolean> = new Subject<boolean>();

  constructor() {
    let tipoInstruccion = localStorage.getItem(this.TIPO_INSTRUCCION) as any;
    if (tipoInstruccion) {
      this.tipoIntruccionChange$.next(tipoInstruccion);
    }
  }

  getTipoMenuChange() {
    return this.tipoIntruccionChange$.asObservable();
  }

  setTipoMenuChange(menu: string) {
    localStorage.setItem(this.TIPO_INSTRUCCION, menu.toString());
    return this.tipoIntruccionChange$.next(menu);
  }

  getFragmentoVistaChange() {
    return this.mostrarFragmentoVistaChange$.asObservable();
  }

  setFragmentoVistaChange(estado: boolean) {
    return this.mostrarFragmentoVistaChange$.next(estado);
  }

  deleteTipoMenuChange() {
    localStorage.removeItem(this.TIPO_INSTRUCCION);
  }
}
