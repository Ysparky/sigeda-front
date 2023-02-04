import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleH1Component } from './title-h1.component';


@NgModule({
  declarations: [
    TitleH1Component
  ],
  imports: [
    CommonModule
  ],
  exports:[
    TitleH1Component
  ]
})
export class TitleH1Module { }
