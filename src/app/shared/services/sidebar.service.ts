import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  constructor(
    @Inject(DOCUMENT) private document: Document) { }

  addSidebarToggle()  {
    this.document.body.classList.add('toggle-sidebar');
  }
  removeSidebarToggle(){
    this.document.body.classList.remove('toggle-sidebar');
  }
}
