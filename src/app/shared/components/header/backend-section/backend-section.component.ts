import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService } from '../../../../core/services/monitor.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-backend-section',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './backend-section.component.html',
  styleUrl: './backend-section.component.css',
  standalone: true,
})
export class BackendSectionComponent implements OnInit {
  isBackendOnline: boolean | null = null; // null = no verificado aún
  isChecking = false;

  // Angular 20 Best Practice: inject() function + DestroyRef
  private readonly translationService = inject(TranslationService);
  private readonly monitorService = inject(MonitorService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    console.log('BackendSectionComponent inicializado - Verificación manual del backend');
    // NO hacer verificación automática, solo manual cuando el usuario haga clic
  }

  // Método público para verificar el estado cuando el usuario haga clic
  checkBackendStatus() {
    console.log('🔍 Verificando estado del backend manualmente...');
    this.isChecking = true;

    this.monitorService.checkBackendStatus().subscribe({
      next: (isOnline: boolean) => {
        this.isBackendOnline = isOnline;
        this.isChecking = false;
        console.log('✅ Estado verificado:', isOnline ? 'ONLINE' : 'OFFLINE');
      },
      error: (error: any) => {
        console.error('❌ Error verificando estado:', error);
        this.isBackendOnline = false;
        this.isChecking = false;
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
