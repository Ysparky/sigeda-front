import { Component, Input } from '@angular/core';
import { NotificationService } from '../../notification/notification.service';
import { StorageInstructionService } from '../../services/storageInstruction.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav-navigation',
  templateUrl: './nav-navigation.component.html',
  styleUrls: ['./nav-navigation.component.css'],
})
export class NavNavigationComponent {
  @Input() vistaComponente!: string;

  constructor(
    private notificationService: NotificationService,
    private storageInstructionService: StorageInstructionService,
    private route: Router
  ) {}

  irPrincipal() {
    if (!localStorage.getItem(this.storageInstructionService.TIPO_INSTRUCCION)) {
      this.notificationService.infoNotification(
        'Aún no has seleccionado un tipo de Instrucción.'
      );
      return;
    }
    this.route.navigate(['/instruction/dashboard'])
  }
}
