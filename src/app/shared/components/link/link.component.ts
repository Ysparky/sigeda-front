import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-link',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.css'],
})
export class LinkComponent {
  @Input() link?: string;
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
