import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.css'],
})
export class CreditsComponent {
  @Input() opacidad: 1 | 0 = 0;

  color(): string {
    let value = '';
    switch (this.opacidad) {
      case 0: // OSCURO
        value = '#012970';
        return value;
      case 1: // CLARO
        value = '#FFF';
        return value;
    }
  }
}
