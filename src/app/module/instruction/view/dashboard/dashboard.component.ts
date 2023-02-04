import { Component, OnInit } from '@angular/core';
import { StorageInstructionService } from '../../../../shared/services/storageInstruction.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit{
  tipoInstruccion!: string;

  constructor(
    private storageInstructionService: StorageInstructionService
  ){
    this.tipoInstruccion = localStorage.getItem(this.storageInstructionService.TIPO_INSTRUCCION) as any;
  }

  ngOnInit(): void {
  }

}
