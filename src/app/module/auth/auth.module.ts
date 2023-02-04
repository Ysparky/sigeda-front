import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthComponent } from './auth.component';
import { LoginComponent } from './view/login/login.component';
import { CreditsComponent } from 'src/app/shared/components/credits/credits.component';
import { InputModule } from 'src/app/shared/components/input/input.module';
import { CheckboxComponent } from 'src/app/shared/components/checkbox/checkbox.component';
import { ButtonModule } from '../../shared/components/button/button.module';
import { LinkModule } from 'src/app/shared/components/link/link.module';
import { ParagraphModule } from 'src/app/shared/components/paragraph/paragraph.module';
import { CardModule } from 'src/app/shared/components/card/card.module';
import { TitleH3Module } from '../../shared/components/title-h3/title-h3.module';

@NgModule({
  declarations: [
    AuthComponent,
    LoginComponent,
    CreditsComponent,
    CheckboxComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    InputModule,
    ButtonModule,
    LinkModule,
    ParagraphModule,
    CardModule,
    TitleH3Module
  ]
})
export class AuthModule { }
