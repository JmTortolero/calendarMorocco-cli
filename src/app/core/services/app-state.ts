import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CompetitionCatalog, CompetitionOption } from './competition';

/**
 * Servicio de estado compartido para competition + season.
 * Todos los componentes leen/escriben aquí para mantener sincronización.
 */
@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly competitionService = inject(CompetitionCatalog);
  private readonly destroyRef = inject(DestroyRef);

  // --- State ---
  readonly competitions = signal<CompetitionOption[]>([]);
  readonly competitionLoading = signal(false);
  readonly competitionError = signal<string | null>(null);

  readonly selectedCompetitionId = signal('');
  readonly selectedSeason = signal(this.getDefaultSeason());

  // --- Computed ---
  readonly enabledCompetitions = computed(() =>
    this.competitions().filter(c => c.enabled)
  );

  readonly selectedCompetition = computed(() =>
    this.enabledCompetitions().find(c => c.id === this.selectedCompetitionId()) ?? null
  );

  readonly hasSelection = computed(() =>
    this.selectedCompetitionId().length > 0 && this.selectedSeason().length > 0
  );

  constructor() {
    this.subscribeToCompetitionService();
  }

  private subscribeToCompetitionService(): void {
    this.competitionService.competitions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(competitions => {
        const enabled = competitions.filter(c => c.enabled);
        this.competitions.set(enabled);

        // Si la competición seleccionada ya no existe, limpiar
        if (
          this.selectedCompetitionId() &&
          !enabled.some(c => c.id === this.selectedCompetitionId())
        ) {
          this.selectedCompetitionId.set('');
        }
      });

    this.competitionService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => this.competitionLoading.set(loading));

    this.competitionService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(error => this.competitionError.set(error));
  }

  // --- Acciones ---
  setCompetition(id: string): void {
    this.selectedCompetitionId.set(id);
  }

  setSeason(season: string): void {
    this.selectedSeason.set(season);
  }

  async refreshCompetitions(): Promise<void> {
    await this.competitionService.refresh();
  }

  private getDefaultSeason(): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const startYear = month >= 6 ? year : year - 1;
    const endYearTwoDigits = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearTwoDigits}`;
  }
}
