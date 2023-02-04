import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from './shared/pages/not-found/not-found.component';

const routes: Routes = [
  {
    path:'',
    loadChildren: () => import('./module/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path:'instruction',
    loadChildren: () => import('./module/instruction/instruction.module').then(m => m.InstructionModule)
  },
  {
    path:'**',
    component: NotFoundComponent
  }
  ];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
