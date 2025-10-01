import { Pipe, PipeTransform, inject } from '@angular/core';
import { Translation } from '../services';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Para que se actualice cuando cambie el idioma
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(Translation);

  transform(key: string): string {
    return this.translationService.translate(key);
  }
}
