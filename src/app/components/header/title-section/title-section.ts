import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-title-section',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './title-section.html',
  styleUrl: './title-section.css',
  standalone: true,
})
export class TitleSection {}
