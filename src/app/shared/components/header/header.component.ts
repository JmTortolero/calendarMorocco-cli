import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleSectionComponent } from './title-section/title-section.component';
import { NavSectionComponent } from './nav-section/nav-section.component';
import { BackendSectionComponent } from './backend-section/backend-section.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, TitleSectionComponent, NavSectionComponent, BackendSectionComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: true,
})
export class HeaderComponent {}
