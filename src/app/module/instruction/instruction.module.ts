import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InstructionRoutingModule } from './instruction-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InstructionComponent } from './instruction.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardComponent } from './view/dashboard/dashboard.component';
import { MainComponent } from './components/main/main.component';
import { SectionComponent } from 'src/app/shared/components/section/section.component';
import { LinkModule } from 'src/app/shared/components/link/link.module';
import { TransitionComponent } from './view/transition/transition.component';
import { ParagraphModule } from '../../shared/components/paragraph/paragraph.module';
import { CardModule } from '../../shared/components/card/card.module';
import { FooterComponent } from './components/footer/footer.component';
import { ProfileComponent } from './view/profile/profile.component';
import { NavNavigationComponent } from 'src/app/shared/components/nav-navigation/nav-navigation.component';
import { CardProfileComponent } from '../../shared/components/card-profile/card-profile.component';
import { TitleH1Module } from 'src/app/shared/components/title-h1/title-h1.module';
import { TitleH4Module } from 'src/app/shared/components/title-h4/title-h4.module';
import { TitleH5Module } from 'src/app/shared/components/title-h5/title-h5.module';
import { TitleH2Module } from 'src/app/shared/components/title-h2/title-h2.module';
import { TitleH6Module } from 'src/app/shared/components/title-h6/title-h6.module';
import { LabelComponent } from 'src/app/shared/components/label/label.component';
import { InputModule } from '../../shared/components/input/input.module';
import { TextAreaComponent } from 'src/app/shared/components/text-area/text-area.component';
import { ButtonModule } from '../../shared/components/button/button.module';


@NgModule({
  declarations: [
    InstructionComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    DashboardComponent,
    MainComponent,

    SectionComponent,
    TransitionComponent,
    ProfileComponent,
    NavNavigationComponent,
    CardProfileComponent,
    LabelComponent,
    TextAreaComponent
  ],
  imports: [
    CommonModule,
    InstructionRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    LinkModule,
    ParagraphModule,
    CardModule,
    TitleH1Module,
    TitleH2Module,
    TitleH4Module,
    TitleH5Module,
    TitleH6Module,
    InputModule,
    ButtonModule
  ]
})
export class InstructionModule { }
