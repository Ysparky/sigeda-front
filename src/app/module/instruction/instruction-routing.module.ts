import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InstructionComponent } from './instruction.component';
import { DashboardComponent } from './view/dashboard/dashboard.component';
import { ProfileComponent } from './view/profile/profile.component';
import { TransitionComponent } from './view/transition/transition.component';

const routes: Routes = [
  {
    // path: 'visit',
    path: '',
    component: InstructionComponent,
    children: [
      {
        path:'',
        redirectTo:'transition',
        pathMatch: 'full'
      },
      { path: '', component: TransitionComponent },
      { path: 'transition', component: TransitionComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },


    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InstructionRoutingModule { }


