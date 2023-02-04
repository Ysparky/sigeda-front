import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleH2Component } from './title-h2.component';


@NgModule({
  declarations: [
    TitleH2Component
  ],
  imports: [
    CommonModule
  ],
  exports:[
    TitleH2Component
  ]
})
export class TitleH2Module { }
