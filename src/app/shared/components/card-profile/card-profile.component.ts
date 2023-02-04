import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card-profile',
  templateUrl: './card-profile.component.html',
  styleUrls: ['./card-profile.component.css']
})
export class CardProfileComponent {
  @Input() nombre!: string;
  @Input() cargo!: string;
}
