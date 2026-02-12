import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CompetitionCatalog } from '../../core/services';
import { CompetitionOption } from '../../core/services/competition';

interface ExcelFileItem {
  fileName: string;
  size: number | null;
  lastModified: string | null;
}

type ExcelListResponse =
  | ExcelFileItem[]
  | string[]
  | { excels?: ExcelFileItem[] | string[]; files?: ExcelFileItem[] | string[]; items?: ExcelFileItem[] | string[] };

@Component({
  selector: 'app-excel-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './excelManager.html',
  styleUrl: './excelManager.css'
})
export class ExcelManager implements OnInit {
  competitionLoading = signal(false);
  competitions = signal<CompetitionOption[]>([]);
  selectedCompetitionId = signal('');
  selectedSeason = signal(this.getDefaultSeason());

  excelFilesLoading = signal(false);
  excelFiles = signal<ExcelFileItem[]>([]);

  selectedExcelFile = signal<File | null>(null);

  uploading = signal(false);
  downloadingFileName = signal<string | null>(null);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  canUpload = computed(() =>
    !this.uploading() &&
    !this.excelFilesLoading() &&
    this.selectedCompetitionId().length > 0 &&
    this.selectedSeason().length > 0 &&
    this.selectedExcelFile() !== null
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
          this.excelFiles.set([]);
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

  async refreshCompetitions(): Promise<void> {
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
      // Error already provided by competitionService.error$
    }
  }

  onCompetitionChange(competitionId: string): void {
    this.selectedCompetitionId.set(competitionId);
    this.excelFiles.set([]);

    if (competitionId && this.selectedSeason()) {
      this.loadExcelFiles();
    }
  }

  onSeasonChange(season: string): void {
    this.selectedSeason.set(season);
    this.excelFiles.set([]);

    if (season && this.selectedCompetitionId()) {
      this.loadExcelFiles();
    }
  }

  onExcelFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedExcelFile.set(input.files[0]);
    } else {
      this.selectedExcelFile.set(null);
    }
  }

  async loadExcelFiles(): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.excelFiles.set([]);
      return;
    }

    this.excelFilesLoading.set(true);
    this.error.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/excels`;
      const response = await firstValueFrom(this.http.get<ExcelListResponse>(url));
      const normalized = this.normalizeExcelListResponse(response);
      this.excelFiles.set(normalized);
    } catch (e: any) {
      if (e?.status === 404) {
        this.excelFiles.set([]);
      } else {
        this.error.set(e?.error?.message || e?.message || 'Error loading Excel files.');
      }
    } finally {
      this.excelFilesLoading.set(false);
    }
  }

  async uploadExcel(): Promise<void> {
    if (!this.selectedCompetitionId()) {
      this.error.set('Please select a competition first.');
      this.success.set(null);
      return;
    }

    if (!this.selectedSeason()) {
      this.error.set('Please set a season first.');
      this.success.set(null);
      return;
    }

    const excelFile = this.selectedExcelFile();
    if (!excelFile) {
      this.error.set('Please choose an Excel file to upload.');
      this.success.set(null);
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/excels`;
      const formData = new FormData();
      formData.append('excel', excelFile);

      await firstValueFrom(this.http.post(url, formData, { observe: 'response' }));

      this.success.set(`Excel '${excelFile.name}' uploaded successfully.`);
      this.selectedExcelFile.set(null);
      await this.loadExcelFiles();
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Error uploading Excel file.');
      this.success.set(null);
    } finally {
      this.uploading.set(false);
    }
  }

  async downloadExcel(fileName: string): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.error.set('Please select competition and season first.');
      this.success.set(null);
      return;
    }

    this.downloadingFileName.set(fileName);
    this.error.set(null);
    this.success.set(null);

    try {
      const url = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}/excels/${encodeURIComponent(fileName)}`;

      const response = await firstValueFrom(this.http.get(url, {
        responseType: 'blob',
        observe: 'response'
      }));

      if (!response || response.status !== 200 || !response.body || response.body.size === 0) {
        throw new Error('Invalid file response from backend.');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = fileName;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      this.downloadFile(response.body, filename);
      this.success.set(`Excel '${filename}' downloaded successfully.`);
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Error downloading Excel file.');
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
