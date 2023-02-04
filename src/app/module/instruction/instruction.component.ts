import {
  Component,
  ElementRef,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
import { StorageInstructionService } from '../../shared/services/storageInstruction.service';
import { SidebarService } from '../../shared/services/sidebar.service';

@Component({
  selector: 'app-instruction',
  templateUrl: './instruction.component.html',
  styleUrls: ['./instruction.component.css'],
})
export class InstructionComponent implements OnInit {
  statusMenu: boolean = true;

  constructor(
    private elementRef: ElementRef,
    public _router: Router,
    private storageInstructionService: StorageInstructionService,
    private sidebarService: SidebarService
  ) {
    if (localStorage.getItem(this.storageInstructionService.TIPO_INSTRUCCION)) {
      this.sidebarService.removeSidebarToggle();
      return
    }
    this.sidebarService.addSidebarToggle();
    this.statusMenu = true
  }

  ngOnInit(): void {
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "../assets/js/main.js";
    this.elementRef.nativeElement.appendChild(s);

    this.storageInstructionService.getTipoMenuChange().subscribe(( _ )=> {
      this.navegar()
    })
    this.storageInstructionService.getFragmentoVistaChange().subscribe((estado) => {
      this.statusMenu = estado
    })

    if (localStorage.getItem(this.storageInstructionService.TIPO_INSTRUCCION)) {
      this.statusMenu = false;
    }
  }


  navegar() {
      this.sidebarService.removeSidebarToggle()
      this._router.navigate(['/instruction/dashboard']);
  }
}
