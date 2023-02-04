import { Component, OnInit } from '@angular/core';
import { StorageInstructionService } from '../../../../shared/services/storageInstruction.service';

@Component({
  selector: 'app-transition',
  templateUrl: './transition.component.html',
  styleUrls: ['./transition.component.css']
})
export class TransitionComponent implements OnInit{

  constructor(
    private storageInstructionService: StorageInstructionService
  ){}

  ngOnInit(): void {
  }
  propagarOpcionMenu(menu: string){
    this.storageInstructionService.setTipoMenuChange(menu);
    this.storageInstructionService.setFragmentoVistaChange(false);
  }
}
