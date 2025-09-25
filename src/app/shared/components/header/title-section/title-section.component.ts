import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-title-section',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './title-section.component.html',
  styleUrl: './title-section.component.css',
  standalone: true,
})
export class TitleSectionComponent {}
