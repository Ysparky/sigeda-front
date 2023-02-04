import { Component, OnInit, Input } from '@angular/core';
import { StorageInstructionService } from '../../../../shared/services/storageInstruction.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit  {
  @Input() hiddenSidebar: boolean = true;

  constructor(
    private storageInstructionService: StorageInstructionService
  ){}

  ngOnInit(): void {
    this.storageInstructionService.getFragmentoVistaChange().subscribe((estado)=>{
      this.hiddenSidebar = estado;
    })

  }
}
