import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleH3Component } from './title-h3.component';



@NgModule({
  declarations: [
    TitleH3Component
  ],
  imports: [
    CommonModule
  ],
  exports:[
    TitleH3Component
  ]
})
export class TitleH3Module { }
