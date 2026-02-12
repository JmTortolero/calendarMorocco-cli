import { Component, inject, OnInit, DestroyRef, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CompetitionCatalog, Translation } from '../../core/services';
import { CompetitionOption } from '../../core/services/competition';

interface ExcelFileItem {
  fileName: string;
  size: number | null;
  lastModified: string | null;
}

interface GenerationLogsResponse {
  generationId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  lines: string[];
}

type ExcelListResponse =
  | ExcelFileItem[]
  | string[]
  | { excels?: ExcelFileItem[] | string[]; files?: ExcelFileItem[] | string[]; items?: ExcelFileItem[] | string[] };

@Component({
  selector: 'app-generate-calendar',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './generateCalendar.html',
  styleUrl: './generateCalendar.css'
})
export class GenerateCalendar implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  lastGenerationId = signal('');
  generationLogsLoading = signal(false);
  generationLogs = signal<string[]>([]);
  generationLogsError = signal<string | null>(null);

  competitionLoading = signal(false);
  competitions = signal<CompetitionOption[]>([]);
  selectedCompetitionId = signal('');
  selectedSeason = signal(this.getDefaultSeason());
  excelFilesLoading = signal(false);
  excelFiles = signal<ExcelFileItem[]>([]);
  selectedExcelFileName = signal('');

  lastRoundToAssign = signal<number | null>(null);

  hasCompetitions = computed(() => this.competitions().length > 0);
  hasExcelFiles = computed(() => this.excelFiles().length > 0);
  hasValidLastRoundToAssign = computed(() => {
    const value = this.lastRoundToAssign();
    return value !== null && Number.isInteger(value) && value > 0;
  });
  hasGenerationLogs = computed(() => this.generationLogs().length > 0);
  generationLogsText = computed(() => this.generationLogs().join('\n'));
  canRefreshGenerationLogs = computed(() =>
    !this.generationLogsLoading() && this.lastGenerationId().trim().length > 0
  );
  canGenerate = computed(() =>
    !this.loading() &&
    !this.competitionLoading() &&
    !this.excelFilesLoading() &&
    this.selectedCompetitionId().length > 0 &&
    this.selectedSeason().length > 0 &&
    this.selectedExcelFileName().length > 0 &&
    this.hasCompetitions() &&
    this.hasExcelFiles() &&
    this.hasValidLastRoundToAssign()
  );

  private readonly stateLogger = effect(() => {
    console.log('GenerateCalendar state', {
      selectedCompetitionId: this.selectedCompetitionId(),
      selectedSeason: this.selectedSeason(),
      selectedExcelFileName: this.selectedExcelFileName(),
      competitionsCount: this.competitions().length,
      excelFilesCount: this.excelFiles().length,
      lastRoundToAssign: this.lastRoundToAssign(),
      lastRoundValid: this.hasValidLastRoundToAssign(),
      hasGenerationLogs: this.hasGenerationLogs(),
      canGenerate: this.canGenerate(),
      loading: this.loading()
    });
  });

  private readonly translationService = inject(Translation);
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
          this.excelFiles.set([]);
          this.selectedExcelFileName.set('');
        }

        if (this.selectedCompetitionId() && this.selectedSeason()) {
          this.loadExcelFiles();
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

  async refreshConfig(): Promise<void> {
    try {
      await this.competitionService.refresh();
      this.error.set(null);
      this.success.set('Competitions updated successfully');

      if (this.selectedCompetitionId() && this.selectedSeason()) {
        await this.loadExcelFiles();
      }

      setTimeout(() => {
        this.success.set(null);
      }, 60000);
    } catch {
      // Error message is already pushed through competitionService.error$
    }
  }

  onCompetitionChange(competitionId: string): void {
    const competitionChanged = competitionId !== this.selectedCompetitionId();
    this.selectedCompetitionId.set(competitionId);
    this.excelFiles.set([]);
    this.selectedExcelFileName.set('');
    this.lastRoundToAssign.set(null);
    if (competitionChanged) {
      this.clearGenerationLogsState();
    }

    if (competitionId && this.selectedSeason()) {
      this.loadExcelFiles();
    }
  }

  onSeasonChange(season: string): void {
    const seasonChanged = season !== this.selectedSeason();
    this.selectedSeason.set(season);
    this.excelFiles.set([]);
    this.selectedExcelFileName.set('');
    if (seasonChanged) {
      this.clearGenerationLogsState();
    }

    if (season && this.selectedCompetitionId()) {
      this.loadExcelFiles();
    }
  }

  onExcelFileFromStorageChange(fileName: string): void {
    const changed = fileName !== this.selectedExcelFileName();
    this.selectedExcelFileName.set(fileName);
    if (changed) {
      this.clearGenerationLogsState();
    }
  }

  async loadExcelFiles(): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.excelFiles.set([]);
      this.selectedExcelFileName.set('');
      return;
    }

    this.excelFilesLoading.set(true);
    this.error.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/excels`;
      const response = await firstValueFrom(this.http.get<ExcelListResponse>(url));
      const files = this.normalizeExcelListResponse(response);

      this.excelFiles.set(files);

      if (
        this.selectedExcelFileName() &&
        !files.some(file => file.fileName === this.selectedExcelFileName())
      ) {
        this.selectedExcelFileName.set('');
      }
    } catch (e: any) {
      if (e?.status === 404) {
        this.excelFiles.set([]);
        this.selectedExcelFileName.set('');
      } else {
        this.error.set(e?.error?.message || e?.message || 'Error loading Excel files.');
      }
    } finally {
      this.excelFilesLoading.set(false);
    }
  }

  onLastRoundToAssignChange(value: string | number | null): void {
    const previousValue = this.lastRoundToAssign();
    let nextValue: number | null = null;

    if (value === null || value === '') {
      nextValue = null;
    } else {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        nextValue = parsed;
      }
    }

    this.lastRoundToAssign.set(nextValue);

    if (previousValue !== nextValue) {
      this.clearGenerationLogsState();
    }
  }

  async generateCalendar(): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason() || !this.selectedExcelFileName()) {
      this.error.set('Please select competition, season and Excel file.');
      this.success.set(null);
      return;
    }

    const lastRoundToAssign = this.lastRoundToAssign();
    if (lastRoundToAssign === null || !Number.isInteger(lastRoundToAssign) || lastRoundToAssign <= 0) {
      this.error.set('Please set a valid Last Round To Assign (> 0).');
      this.success.set(null);
      return;
    }

    if (
      this.competitions().length > 0 &&
      !this.competitionService.hasCompetitionId(this.selectedCompetitionId())
    ) {
      this.error.set(`Selected competition is not valid: ${this.selectedCompetitionId()}`);
      this.success.set(null);
      return;
    }

    if (
      this.excelFiles().length > 0 &&
      !this.excelFiles().some(file => file.fileName === this.selectedExcelFileName())
    ) {
      this.error.set(`Selected Excel file is not valid: ${this.selectedExcelFileName()}`);
      this.success.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.generationLogsError.set(null);

    try {
      const formData = new FormData();
      formData.append('competitionId', this.selectedCompetitionId());
      formData.append('season', this.selectedSeason());
      formData.append('excelFileName', this.selectedExcelFileName());
      formData.append('lastRoundToAssign', String(lastRoundToAssign));

      const apiUrl = '/api/calendar/generate';

      try {
        await firstValueFrom(this.http.get('/actuator/health'));
      } catch (healthError: any) {
        if (healthError.status !== 0) {
          throw new Error(`Backend not available (${healthError.status}): ${healthError.message}`);
        }
      }

      const response = await firstValueFrom(this.http.post(apiUrl, formData, {
        responseType: 'blob',
        observe: 'response',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*'
        }
      }));

      if (!response || response.status !== 200) {
        throw new Error(`HTTP ${response?.status}: download failed`);
      }

      const blob = response.body;
      if (!blob || blob.size === 0) {
        throw new Error('Empty file received from backend');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'calendario.xlsx';

      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const generationId = response.headers.get('X-Generation-Id') ?? '';
      this.lastGenerationId.set(generationId);

      this.downloadFile(blob, filename);
      this.success.set(this.translationService.translate('calendar.success'));
      await this.refreshGenerationLogs(generationId);
    } catch (e: any) {
      const generationId = e?.headers?.get?.('X-Generation-Id') ?? '';
      if (generationId) {
        this.lastGenerationId.set(generationId);
        await this.refreshGenerationLogs(generationId);
      }

      const backendMessage = typeof e?.error === 'string'
        ? e.error
        : e?.error?.message;

      this.error.set(backendMessage || e?.message || this.translationService.translate('calendar.errorUnknown'));
      this.success.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshGenerationLogs(generationIdInput?: string): Promise<void> {
    const generationId = (generationIdInput ?? this.lastGenerationId()).trim();
    if (!generationId) {
      this.generationLogsError.set('Run a generation first to load logs.');
      return;
    }

    this.generationLogsLoading.set(true);
    this.generationLogsError.set(null);

    try {
      const endpoint = `/api/calendar/generations/${encodeURIComponent(generationId)}/logs`;
      const response = await firstValueFrom(this.http.get<GenerationLogsResponse>(endpoint));
      const parsedLogs = this.parseAndSanitizeLogs(response?.lines ?? []);
      this.generationLogs.set(parsedLogs);

      if (response?.status === 'FAILED' && response.errorMessage) {
        this.generationLogsError.set(response.errorMessage);
      } else if (parsedLogs.length === 0) {
        this.generationLogsError.set('No logs available for this generation.');
      }
    } catch (error: any) {
      this.generationLogsError.set(error?.error?.message || error?.message || 'Error loading generation logs.');
    } finally {
      this.generationLogsLoading.set(false);
    }
  }

  private downloadFile(blob: Blob, filename: string): void {
    try {
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
    } catch {
      throw new Error('Could not start file download');
    }
  }

  get currentTranslationService() {
    return this.translationService;
  }

  private normalizeExcelListResponse(response: ExcelListResponse): ExcelFileItem[] {
    const source = this.extractListSource(response);

    return source
      .map(item => this.normalizeExcelListItem(item))
      .filter((item): item is ExcelFileItem => item !== null)
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  private extractListSource(response: ExcelListResponse): Array<ExcelFileItem | string> {
    if (Array.isArray(response)) {
      return response as Array<ExcelFileItem | string>;
    }

    if (response && Array.isArray(response.excels)) {
      return response.excels as Array<ExcelFileItem | string>;
    }

    if (response && Array.isArray(response.files)) {
      return response.files as Array<ExcelFileItem | string>;
    }

    if (response && Array.isArray(response.items)) {
      return response.items as Array<ExcelFileItem | string>;
    }

    return [];
  }

  private normalizeExcelListItem(item: ExcelFileItem | string): ExcelFileItem | null {
    if (typeof item === 'string') {
      return {
        fileName: item,
        size: null,
        lastModified: null
      };
    }

    if (!item || typeof item.fileName !== 'string' || !item.fileName) {
      return null;
    }

    return {
      fileName: item.fileName,
      size: typeof item.size === 'number' ? item.size : null,
      lastModified: typeof item.lastModified === 'string' ? item.lastModified : null
    };
  }

  private getDefaultSeason(): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const startYear = month >= 6 ? year : year - 1;
    const endYearTwoDigits = String((startYear + 1) % 100).padStart(2, '0');

    return `${startYear}-${endYearTwoDigits}`;
  }

  private parseAndSanitizeLogs(input: unknown): string[] {
    const parsedItems = this.extractLogItems(input);
    return parsedItems
      .map(item => this.sanitizeLogLine(item))
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  private extractLogItems(input: unknown): string[] {
    if (Array.isArray(input)) {
      return input.map(item => String(item ?? ''));
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return this.extractLogItemsFromJson(parsed);
      } catch {
        return trimmed.split(/\r?\n/);
      }
    }

    if (input && typeof input === 'object') {
      return this.extractLogItemsFromJson(input);
    }

    return [];
  }

  private extractLogItemsFromJson(parsed: unknown): string[] {
    if (typeof parsed === 'string') {
      return parsed.split(/\r?\n/);
    }

    if (Array.isArray(parsed)) {
      return parsed
        .map(item => String(item ?? ''))
        .flatMap(item => item.split(/\r?\n/));
    }

    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const candidate = obj['logs'] ?? obj['lines'] ?? obj['items'] ?? obj['content'] ?? '';
      if (Array.isArray(candidate)) {
        return candidate
          .map(item => String(item ?? ''))
          .flatMap(item => item.split(/\r?\n/));
      }
      if (typeof candidate === 'string') {
        return candidate.split(/\r?\n/);
      }
    }

    return [];
  }

  private sanitizeLogLine(line: string): string {
    const withPrefixRemoved = line.replace(
      /^\d{4}-\d{2}-\d{2}T[^\s]+\s+\w+\s+\d+\s+---\s+\[[^\]]+\]\s+\[[^\]]+\]\s+[^:]+:\s*/,
      ''
    );

    if (withPrefixRemoved !== line) {
      return withPrefixRemoved;
    }

    const firstUsefulColon = line.indexOf(': ');
    if (firstUsefulColon >= 0 && firstUsefulColon < line.length - 2) {
      return line.substring(firstUsefulColon + 2);
    }

    return line;
  }

  private clearGenerationLogsState(): void {
    this.lastGenerationId.set('');
    this.generationLogs.set([]);
    this.generationLogsError.set(null);
  }
}
