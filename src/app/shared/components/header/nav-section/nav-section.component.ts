import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-nav-section',
  imports: [RouterLink, RouterLinkActive, CommonModule, TranslatePipe],
  templateUrl: './nav-section.component.html',
  styleUrl: './nav-section.component.css',
  standalone: true,
})
export class NavSectionComponent {
  // Angular 20 Best Practice: RouterLinkActive handles active state automatically
  // No need for manual isActive() implementation
}
