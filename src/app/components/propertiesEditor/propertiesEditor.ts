import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-properties-editor',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './propertiesEditor.html',
  styleUrl: './propertiesEditor.css'
})
export class PropertiesEditor {
  // Este es un componente placeholder para la futura funcionalidad de edición de properties
  // Se implementará en una versión posterior
}
