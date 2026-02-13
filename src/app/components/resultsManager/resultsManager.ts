import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CompetitionCatalog } from '../../core/services';
import { AppState } from '../../core/services/app-state';
import { CompetitionOption } from '../../core/services/competition';

interface ResultFileItem {
  fileName: string;
  size: number | null;
  lastModified: string | null;
  version: string;
  downloadId: string | null;
}

interface ResultFileRaw {
  fileName?: string;
  name?: string;
  size?: number | null;
  lastModified?: string | null;
  version?: string | null;
  downloadId?: string | null;
}

type ResultListResponse =
  | ResultFileRaw[]
  | string[]
  | {
      results?: ResultFileRaw[] | string[];
      items?: ResultFileRaw[] | string[];
      files?: ResultFileRaw[] | string[];
      excels?: ResultFileRaw[] | string[];
      generated?: ResultFileRaw[] | string[];
    };

@Component({
  selector: 'app-results-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './resultsManager.html',
  styleUrl: './resultsManager.css'
})
export class ResultsManager implements OnInit {
  competitionLoading = signal(false);
  competitions = signal<CompetitionOption[]>([]);
  selectedCompetitionId = signal('');
  selectedSeason = signal(this.getDefaultSeason());

  resultFilesLoading = signal(false);
  resultFiles = signal<ResultFileItem[]>([]);
  downloadingFileName = signal<string | null>(null);

  error = signal<string | null>(null);
  success = signal<string | null>(null);

  hasResultFiles = computed(() => this.resultFiles().length > 0);

  private readonly http = inject(HttpClient);
  private readonly competitionService = inject(CompetitionCatalog);
  private readonly destroyRef = inject(DestroyRef);
  readonly appState = inject(AppState);

  ngOnInit(): void {
    // Sync from shared state
    if (this.appState.selectedCompetitionId()) {
      this.selectedCompetitionId.set(this.appState.selectedCompetitionId());
    }
    if (this.appState.selectedSeason()) {
      this.selectedSeason.set(this.appState.selectedSeason());
    }
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
          this.resultFiles.set([]);
        }

        if (this.selectedCompetitionId() && this.selectedSeason()) {
          this.loadResultFiles();
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
        await this.loadResultFiles();
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
    this.appState.setCompetition(competitionId);
    this.resultFiles.set([]);

    if (competitionId && this.selectedSeason()) {
      this.loadResultFiles();
    }
  }

  onSeasonChange(season: string): void {
    this.selectedSeason.set(season);
    this.appState.setSeason(season);
    this.resultFiles.set([]);

    if (season && this.selectedCompetitionId()) {
      this.loadResultFiles();
    }
  }

  async loadResultFiles(): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.resultFiles.set([]);
      return;
    }

    this.resultFilesLoading.set(true);
    this.error.set(null);

    const endpoints = this.buildResultListEndpoints();
    let lastNon404Error: any = null;

    try {
      for (const endpoint of endpoints) {
        try {
          const response = await firstValueFrom(this.http.get<ResultListResponse>(endpoint));
          const normalizedFiles = this.normalizeResultListResponse(response);
          this.resultFiles.set(normalizedFiles);
          return;
        } catch (error: any) {
          if (error?.status === 404 || error?.status === 405) {
            continue;
          }
          lastNon404Error = error;
        }
      }

      if (lastNon404Error) {
        throw lastNon404Error;
      }

      this.resultFiles.set([]);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Error loading generated result files.');
      this.resultFiles.set([]);
    } finally {
      this.resultFilesLoading.set(false);
    }
  }

  async downloadResultFile(fileName: string): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.error.set('Please select competition and season first.');
      this.success.set(null);
      return;
    }

    const targetFile = this.resultFiles().find(file => file.fileName === fileName) ?? null;
    const encodedFileName = encodeURIComponent(fileName);
    const base = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}`;
    const candidateEndpoints: string[] = [];

    if (targetFile?.downloadId) {
      candidateEndpoints.push(
        `${base}/generated-full-calendars/${encodeURIComponent(targetFile.downloadId)}`
      );
    }

    candidateEndpoints.push(`${base}/results/${encodedFileName}`);
    candidateEndpoints.push(`${base}/generated-results/${encodedFileName}`);
    candidateEndpoints.push(`${base}/generated-full-calendars/${encodedFileName}`);
    candidateEndpoints.push(`${base}/results/download?fileName=${encodedFileName}`);

    this.downloadingFileName.set(fileName);
    this.error.set(null);
    this.success.set(null);

    let lastNon404Error: any = null;

    try {
      for (const endpoint of Array.from(new Set(candidateEndpoints))) {
        try {
          const response = await firstValueFrom(this.http.get(endpoint, {
            responseType: 'blob',
            observe: 'response'
          }));

          if (!response || response.status !== 200 || !response.body || response.body.size === 0) {
            continue;
          }

          const contentDisposition = response.headers.get('Content-Disposition');
          let downloadedFileName = fileName;
          if (contentDisposition) {
            const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (matches && matches[1]) {
              downloadedFileName = matches[1].replace(/['"]/g, '');
            }
          }

          this.downloadFile(response.body, downloadedFileName);
          this.success.set(`Result file '${downloadedFileName}' downloaded successfully.`);
          return;
        } catch (error: any) {
          if (error?.status === 404 || error?.status === 405) {
            continue;
          }
          lastNon404Error = error;
        }
      }

      if (lastNon404Error) {
        throw lastNon404Error;
      }

      throw new Error(`Result file not found on backend: ${fileName}`);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Error downloading generated result file.');
      this.success.set(null);
    } finally {
      this.downloadingFileName.set(null);
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

  private normalizeResultListResponse(response: ResultListResponse): ResultFileItem[] {
    const source = this.extractResultListSource(response);

    return source
      .map(item => this.normalizeResultListItem(item))
      .filter((item): item is ResultFileItem => item !== null)
      .filter(item => this.isFullCalendarFile(item.fileName))
      .sort((a, b) => this.compareByVersionThenName(a, b));
  }

  private extractResultListSource(response: ResultListResponse): Array<ResultFileRaw | string> {
    if (Array.isArray(response)) {
      return response as Array<ResultFileRaw | string>;
    }

    if (response && Array.isArray(response.results)) {
      return response.results as Array<ResultFileRaw | string>;
    }

    if (response && Array.isArray(response.items)) {
      return response.items as Array<ResultFileRaw | string>;
    }

    if (response && Array.isArray(response.files)) {
      return response.files as Array<ResultFileRaw | string>;
    }

    if (response && Array.isArray(response.excels)) {
      return response.excels as Array<ResultFileRaw | string>;
    }

    if (response && Array.isArray(response.generated)) {
      return response.generated as Array<ResultFileRaw | string>;
    }

    return [];
  }

  private normalizeResultListItem(item: ResultFileRaw | string): ResultFileItem | null {
    if (typeof item === 'string') {
      const fileName = item.trim();
      if (!fileName) {
        return null;
      }

      return {
        fileName,
        size: null,
        lastModified: null,
        version: this.extractVersion(fileName),
        downloadId: null
      };
    }

    const fileName = typeof item?.fileName === 'string'
      ? item.fileName
      : (typeof item?.name === 'string' ? item.name : '');

    if (!fileName) {
      return null;
    }

    return {
      fileName,
      size: typeof item.size === 'number' ? item.size : null,
      lastModified: typeof item.lastModified === 'string' ? item.lastModified : null,
      version: typeof item.version === 'string' && item.version.trim().length > 0
        ? item.version
        : this.extractVersion(fileName),
      downloadId: typeof item.downloadId === 'string' && item.downloadId.trim().length > 0
        ? item.downloadId
        : null
    };
  }

  private isFullCalendarFile(fileName: string): boolean {
    return /^fullcalendar.*\.xlsx$/i.test(fileName.trim());
  }

  private extractVersion(fileName: string): string {
    const normalized = fileName.trim();
    const match = normalized.match(/-v(\d+)(?=\.xlsx$)/i);
    if (match && match[1]) {
      return `v${match[1]}`;
    }

    return 'v0';
  }

  private compareByVersionThenName(a: ResultFileItem, b: ResultFileItem): number {
    const versionA = this.toVersionNumber(a.version);
    const versionB = this.toVersionNumber(b.version);

    if (versionA !== versionB) {
      return versionB - versionA;
    }

    return a.fileName.localeCompare(b.fileName);
  }

  private toVersionNumber(version: string): number {
    const match = version.match(/v(\d+)/i);
    if (!match || !match[1]) {
      return 0;
    }
    return Number(match[1]);
  }

  private buildResultListEndpoints(): string[] {
    const competitionId = encodeURIComponent(this.selectedCompetitionId());
    const season = encodeURIComponent(this.selectedSeason());
    const base = `/api/calendar/competitions/${competitionId}/seasons/${season}`;

    return [
      `${base}/results`,
      `${base}/generated-results`,
      `${base}/generated-full-calendars`
    ];
  }

  private getDefaultSeason(): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const startYear = month >= 6 ? year : year - 1;
    const endYearTwoDigits = String((startYear + 1) % 100).padStart(2, '0');

    return `${startYear}-${endYearTwoDigits}`;
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
}
