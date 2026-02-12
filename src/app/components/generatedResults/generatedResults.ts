import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CompetitionCatalog } from '../../core/services';
import { CompetitionOption } from '../../core/services/competition';

interface GeneratedCalendarItem {
  fileName: string;
  version: string;
  folder: string;
  size: number | null;
  lastModified: string | null;
  downloadId: string;
}

type GeneratedCalendarListResponse =
  | GeneratedCalendarItem[]
  | { items?: GeneratedCalendarItem[]; files?: GeneratedCalendarItem[] };

@Component({
  selector: 'app-generated-results',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './generatedResults.html',
  styleUrl: './generatedResults.css'
})
export class GeneratedResults implements OnInit {
  competitionLoading = signal(false);
  competitions = signal<CompetitionOption[]>([]);
  selectedCompetitionId = signal('');
  selectedSeason = signal(this.getDefaultSeason());

  generatedFilesLoading = signal(false);
  generatedFiles = signal<GeneratedCalendarItem[]>([]);
  downloadingDownloadId = signal<string | null>(null);

  error = signal<string | null>(null);
  success = signal<string | null>(null);

  hasSelection = computed(() =>
    this.selectedCompetitionId().length > 0 && this.selectedSeason().length > 0
  );

  private readonly http = inject(HttpClient);
  private readonly competitionService = inject(CompetitionCatalog);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.subscribeToCompetitionService();
  }

  private subscribeToCompetitionService(): void {
    this.competitionService.competitions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(competitions => {
        const enabledCompetitions = competitions.filter(competition => competition.enabled);
        this.competitions.set(enabledCompetitions);

        if (
          this.selectedCompetitionId() &&
          !enabledCompetitions.some(competition => competition.id === this.selectedCompetitionId())
        ) {
          this.selectedCompetitionId.set('');
          this.generatedFiles.set([]);
        }

        if (this.selectedCompetitionId() && this.selectedSeason()) {
          this.loadGeneratedFiles();
        }
      });

    this.competitionService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.competitionLoading.set(loading);
      });

    this.competitionService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(serviceError => {
        if (serviceError) {
          this.error.set(serviceError);
        }
      });
  }

  async refreshCompetitions(): Promise<void> {
    try {
      await this.competitionService.refresh();
      this.error.set(null);
      this.success.set('Competitions updated successfully');

      if (this.selectedCompetitionId() && this.selectedSeason()) {
        await this.loadGeneratedFiles();
      }

      setTimeout(() => {
        this.success.set(null);
      }, 60000);
    } catch {
      // Error already provided by competitionService.error$
    }
  }

  onCompetitionChange(competitionId: string): void {
    this.selectedCompetitionId.set(competitionId);
    this.generatedFiles.set([]);

    if (competitionId && this.selectedSeason()) {
      this.loadGeneratedFiles();
    }
  }

  onSeasonChange(season: string): void {
    this.selectedSeason.set(season);
    this.generatedFiles.set([]);

    if (season && this.selectedCompetitionId()) {
      this.loadGeneratedFiles();
    }
  }

  async loadGeneratedFiles(): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.generatedFiles.set([]);
      return;
    }

    this.generatedFilesLoading.set(true);
    this.error.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/generated-full-calendars`;
      const response = await firstValueFrom(this.http.get<GeneratedCalendarListResponse>(url));
      const normalized = this.normalizeGeneratedFileResponse(response);
      this.generatedFiles.set(normalized);
    } catch (e: any) {
      if (e?.status === 404) {
        this.generatedFiles.set([]);
      } else {
        this.error.set(e?.error?.message || e?.message || 'Error loading generated files.');
      }
    } finally {
      this.generatedFilesLoading.set(false);
    }
  }

  async downloadGeneratedFile(downloadId: string): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.error.set('Please select competition and season first.');
      this.success.set(null);
      return;
    }

    this.downloadingDownloadId.set(downloadId);
    this.error.set(null);
    this.success.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/generated-full-calendars/${encodeURIComponent(downloadId)}`;
      const response = await firstValueFrom(this.http.get(url, {
        responseType: 'blob',
        observe: 'response'
      }));

      if (!response || response.status !== 200 || !response.body || response.body.size === 0) {
        throw new Error('Invalid file response from backend.');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'fullCalendar.xlsx';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      this.downloadFile(response.body, filename);
      this.success.set(`Generated calendar '${filename}' downloaded successfully.`);
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Error downloading generated calendar file.');
      this.success.set(null);
    } finally {
      this.downloadingDownloadId.set(null);
    }
  }

  formatBytes(size: number | null): string {
    if (size === null || Number.isNaN(size)) {
      return '-';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  private normalizeGeneratedFileResponse(response: GeneratedCalendarListResponse): GeneratedCalendarItem[] {
    const source = this.extractListSource(response);
    return source
      .filter(item => item && item.fileName && item.downloadId)
      .map(item => ({
        fileName: item.fileName,
        version: item.version || 'base',
        folder: item.folder || '',
        size: typeof item.size === 'number' ? item.size : null,
        lastModified: item.lastModified || null,
        downloadId: item.downloadId
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  private extractListSource(response: GeneratedCalendarListResponse): GeneratedCalendarItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    if (response && Array.isArray(response.files)) {
      return response.files;
    }

    return [];
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
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
