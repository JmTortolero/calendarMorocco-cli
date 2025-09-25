import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService } from '../../../../core/services/monitor.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-backend-section',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './backend-section.component.html',
  styleUrl: './backend-section.component.css',
  standalone: true,
})
export class BackendSectionComponent implements OnInit {
  isBackendOnline = false;

  // Angular 20 Best Practice: inject() function + DestroyRef
  private readonly translationService = inject(TranslationService);
  private readonly monitorService = inject(MonitorService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    console.log('BackendSectionComponent inicializado - Monitoreando estado del backend');

    // Angular 20 Best Practice: takeUntilDestroyed()
    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.checkBackendStatus();
      });

    // Verificación inicial
    this.checkBackendStatus();
  }

  private checkBackendStatus() {
    this.monitorService.checkBackendStatus().subscribe({
      next: (isOnline: boolean) => {
        this.isBackendOnline = isOnline;
      },
      error: (error: any) => {
        console.error('Error verificando estado desde BackendSectionComponent:', error);
        this.isBackendOnline = false;
      },
    });
  }

  setLanguage(lang: 'en' | 'ar') {
    this.translationService.setLanguage(lang);
  }

  // Getter para template access - Angular 20 Best Practice
  get currentTranslationService() {
    return this.translationService;
  }
}
