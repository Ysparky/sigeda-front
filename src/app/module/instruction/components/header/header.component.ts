import {
  Component,
  OnInit,
  Inject,
  Input
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { StorageInstructionService } from '../../../../shared/services/storageInstruction.service';
import { SidebarService } from '../../../../shared/services/sidebar.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit{
  @Input() hiddenHeader: boolean = true;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private storageInstructionService: StorageInstructionService,
    private sidebarService: SidebarService,
    private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.storageInstructionService.getFragmentoVistaChange().subscribe(( estado )=>{
      this.hiddenHeader = estado;
    })
  }

  sidebarToggle() {
    this.document.body.classList.toggle('toggle-sidebar');
  }

  deleteStorageInstruction() {
    this.storageInstructionService.deleteTipoMenuChange();
    this.router.navigate(['/']);
  }

  irPrincipal() {
    this.storageInstructionService.deleteTipoMenuChange();
    this.sidebarService.addSidebarToggle();
    this.router.navigate(['/instruction/transition']);
    this.storageInstructionService.setFragmentoVistaChange(true);
  }
}
