import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CompetitionCatalog } from '../../core/services';
import { AppState } from '../../core/services/app-state';
import { CompetitionOption } from '../../core/services/competition';

type ArtifactType = 'XLSX' | 'ZIP';

interface GeneratedArtifactItem {
  fileName: string;
  version: string;
  folder: string;
  size: number | null;
  lastModified: string | null;
  artifactType: ArtifactType;
  downloadId: string | null;
}

interface GeneratedArtifactRaw {
  fileName?: string | null;
  name?: string | null;
  version?: string | null;
  folder?: string | null;
  size?: number | null;
  lastModified?: string | null;
  downloadId?: string | null;
  id?: string | null;
}

type GeneratedArtifactListResponse =
  | GeneratedArtifactRaw[]
  | string[]
  | {
      items?: GeneratedArtifactRaw[] | string[];
      files?: GeneratedArtifactRaw[] | string[];
      generated?: GeneratedArtifactRaw[] | string[];
      results?: GeneratedArtifactRaw[] | string[];
      artifacts?: GeneratedArtifactRaw[] | string[];
    };

interface VersionGroup {
  version: string;
  versionNumber: number;
  xlsxFile: GeneratedArtifactItem | null;
  zipFile: GeneratedArtifactItem | null;
}

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
  generatedFiles = signal<GeneratedArtifactItem[]>([]);
  downloadingFileName = signal<string | null>(null);

  error = signal<string | null>(null);
  success = signal<string | null>(null);

  hasSelection = computed(() =>
    this.selectedCompetitionId().length > 0 && this.selectedSeason().length > 0
  );

  versionGroups = computed<VersionGroup[]>(() => {
    const files = this.generatedFiles();
    const groupMap = new Map<string, VersionGroup>();

    for (const file of files) {
      const version = file.version;
      if (!groupMap.has(version)) {
        groupMap.set(version, {
          version,
          versionNumber: this.toVersionNumber(version),
          xlsxFile: null,
          zipFile: null
        });
      }
      const group = groupMap.get(version)!;
      if (file.artifactType === 'XLSX') {
        group.xlsxFile = file;
      } else if (file.artifactType === 'ZIP') {
        group.zipFile = file;
      }
    }

    return Array.from(groupMap.values())
      .sort((a, b) => b.versionNumber - a.versionNumber);
  });

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
    this.appState.setCompetition(competitionId);
    this.generatedFiles.set([]);

    if (competitionId && this.selectedSeason()) {
      this.loadGeneratedFiles();
    }
  }

  onSeasonChange(season: string): void {
    this.selectedSeason.set(season);
    this.appState.setSeason(season);
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
    this.success.set(null);

    const endpoints = this.buildGeneratedListEndpoints();
    let lastNon404Error: any = null;
    let successfulEndpointCount = 0;
    const collectedFiles: GeneratedArtifactItem[] = [];

    try {
      for (const endpoint of endpoints) {
        try {
          const response = await firstValueFrom(this.http.get<GeneratedArtifactListResponse>(endpoint));
          const normalized = this.normalizeGeneratedFileResponse(response);
          successfulEndpointCount++;
          collectedFiles.push(...normalized);
        } catch (error: any) {
          if (error?.status === 404 || error?.status === 405) {
            continue;
          }
          lastNon404Error = error;
        }
      }

      if (lastNon404Error && successfulEndpointCount === 0) {
        throw lastNon404Error;
      }

      const merged = this.mergeGeneratedFiles(collectedFiles);
      this.generatedFiles.set(merged);
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Error loading generated files.');
      this.generatedFiles.set([]);
    } finally {
      this.generatedFilesLoading.set(false);
    }
  }

  async downloadGeneratedFile(file: GeneratedArtifactItem): Promise<void> {
    if (!this.selectedCompetitionId() || !this.selectedSeason()) {
      this.error.set('Please select competition and season first.');
      this.success.set(null);
      return;
    }

    this.downloadingFileName.set(file.fileName);
    this.error.set(null);
    this.success.set(null);

    const base = `/api/calendar/competitions/${encodeURIComponent(this.selectedCompetitionId())}/seasons/${encodeURIComponent(this.selectedSeason())}`;
    const encodedFileName = encodeURIComponent(file.fileName);
    const endpoints: string[] = [];

    if (file.downloadId) {
      endpoints.push(`${base}/generated-full-calendars/${encodeURIComponent(file.downloadId)}`);
    }

    endpoints.push(`${base}/generated-results/${encodedFileName}`);
    endpoints.push(`${base}/generated-full-calendars/${encodedFileName}`);
    endpoints.push(`${base}/results/${encodedFileName}`);
    endpoints.push(`${base}/artifacts/${encodedFileName}`);
    endpoints.push(`${base}/results/download?fileName=${encodedFileName}`);

    let lastNon404Error: any = null;

    try {
      for (const endpoint of Array.from(new Set(endpoints))) {
        try {
          const response = await firstValueFrom(this.http.get(endpoint, {
            responseType: 'blob',
            observe: 'response'
          }));

          if (!response || response.status !== 200 || !response.body || response.body.size === 0) {
            continue;
          }

          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = file.fileName;
          if (contentDisposition) {
            const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (matches && matches[1]) {
              filename = matches[1].replace(/['"]/g, '');
            }
          }

          this.downloadFile(response.body, filename);
          this.success.set(`Generated file '${filename}' downloaded successfully.`);
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

      throw new Error(`Generated file not found on backend: ${file.fileName}`);
    } catch (e: any) {
      this.error.set(e?.error?.message || e?.message || 'Error downloading generated file.');
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

  private normalizeGeneratedFileResponse(response: GeneratedArtifactListResponse): GeneratedArtifactItem[] {
    const source = this.extractListSource(response);
    return source
      .map(item => this.normalizeGeneratedItem(item))
      .filter((item): item is GeneratedArtifactItem => item !== null)
      .filter(item => this.isSupportedGeneratedArtifact(item.fileName))
      .sort((a, b) => this.compareArtifacts(a, b));
  }

  private extractListSource(response: GeneratedArtifactListResponse): Array<GeneratedArtifactRaw | string> {
    if (Array.isArray(response)) {
      return response as Array<GeneratedArtifactRaw | string>;
    }

    if (response && Array.isArray(response.items)) {
      return response.items as Array<GeneratedArtifactRaw | string>;
    }

    if (response && Array.isArray(response.files)) {
      return response.files as Array<GeneratedArtifactRaw | string>;
    }

    if (response && Array.isArray(response.generated)) {
      return response.generated as Array<GeneratedArtifactRaw | string>;
    }

    if (response && Array.isArray(response.results)) {
      return response.results as Array<GeneratedArtifactRaw | string>;
    }

    if (response && Array.isArray(response.artifacts)) {
      return response.artifacts as Array<GeneratedArtifactRaw | string>;
    }

    return [];
  }

  private getDefaultSeason(): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const startYear = month >= 6 ? year : year - 1;
    const endYearTwoDigits = String((startYear + 1) % 100).padStart(2, '0');

    return `${startYear}-${endYearTwoDigits}`;
  }

  private normalizeGeneratedItem(item: GeneratedArtifactRaw | string): GeneratedArtifactItem | null {
    const fileName = this.resolveFileName(item);
    if (!fileName) {
      return null;
    }

    const objectItem = typeof item === 'string' ? null : item;
    const artifactType = this.getArtifactType(fileName);

    return {
      fileName,
      version: this.extractVersion(fileName, objectItem?.version),
      folder: typeof objectItem?.folder === 'string' ? objectItem.folder : '',
      size: typeof objectItem?.size === 'number' ? objectItem.size : null,
      lastModified: typeof objectItem?.lastModified === 'string' ? objectItem.lastModified : null,
      artifactType,
      downloadId: this.resolveDownloadId(objectItem)
    };
  }

  private resolveFileName(item: GeneratedArtifactRaw | string): string {
    if (typeof item === 'string') {
      return item.trim();
    }

    const fileName = typeof item?.fileName === 'string'
      ? item.fileName
      : (typeof item?.name === 'string' ? item.name : '');

    return fileName.trim();
  }

  private resolveDownloadId(item: GeneratedArtifactRaw | null): string | null {
    if (!item) {
      return null;
    }

    const candidate = typeof item.downloadId === 'string' && item.downloadId.trim().length > 0
      ? item.downloadId
      : (typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : '');

    return candidate ? candidate.trim() : null;
  }

  private getArtifactType(fileName: string): ArtifactType {
    return /\.zip$/i.test(fileName.trim()) ? 'ZIP' : 'XLSX';
  }

  private isSupportedGeneratedArtifact(fileName: string): boolean {
    const normalized = fileName.trim();

    if (/^out.*\.csv$/i.test(normalized)) {
      return false;
    }

    if (/^fullcalendar.*\.xlsx$/i.test(normalized)) {
      return true;
    }

    return /\.zip$/i.test(normalized);
  }

  private extractVersion(fileName: string, fallbackVersion: string | null | undefined): string {
    if (typeof fallbackVersion === 'string' && fallbackVersion.trim().length > 0) {
      return fallbackVersion.trim();
    }

    const versionMatch = fileName.match(/-v(\d+)(?=\.(xlsx|zip)$)/i);
    if (versionMatch && versionMatch[1]) {
      return `v${versionMatch[1]}`;
    }

    return 'v0';
  }

  private compareArtifacts(a: GeneratedArtifactItem, b: GeneratedArtifactItem): number {
    const typeRankA = a.artifactType === 'XLSX' ? 0 : 1;
    const typeRankB = b.artifactType === 'XLSX' ? 0 : 1;

    if (typeRankA !== typeRankB) {
      return typeRankA - typeRankB;
    }

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

  private buildGeneratedListEndpoints(): string[] {
    const competitionId = encodeURIComponent(this.selectedCompetitionId());
    const season = encodeURIComponent(this.selectedSeason());
    const base = `/api/calendar/competitions/${competitionId}/seasons/${season}`;

    return [
      `${base}/generated-full-calendars`,
      `${base}/generated-results`,
      `${base}/results`
    ];
  }

  private mergeGeneratedFiles(files: GeneratedArtifactItem[]): GeneratedArtifactItem[] {
    const byKey = new Map<string, GeneratedArtifactItem>();

    for (const file of files) {
      const key = `${file.version}::${file.artifactType}`.toLowerCase();
      const previous = byKey.get(key);

      if (!previous) {
        byKey.set(key, file);
        continue;
      }

      const keep = this.shouldReplaceArtifact(previous, file) ? file : previous;
      byKey.set(key, keep);
    }

    return Array.from(byKey.values()).sort((a, b) => this.compareArtifacts(a, b));
  }

  private shouldReplaceArtifact(current: GeneratedArtifactItem, candidate: GeneratedArtifactItem): boolean {
    // Prefer shorter folder path (main version directory vs nested subdirectory)
    const currentFolderDepth = (current.folder || '').split('/').filter(Boolean).length;
    const candidateFolderDepth = (candidate.folder || '').split('/').filter(Boolean).length;
    if (currentFolderDepth !== candidateFolderDepth) {
      return candidateFolderDepth < currentFolderDepth;
    }

    const currentTime = current.lastModified ? new Date(current.lastModified).getTime() : 0;
    const candidateTime = candidate.lastModified ? new Date(candidate.lastModified).getTime() : 0;

    if (candidateTime !== currentTime) {
      return candidateTime > currentTime;
    }

    const currentSize = current.size ?? 0;
    const candidateSize = candidate.size ?? 0;
    if (candidateSize !== currentSize) {
      return candidateSize > currentSize;
    }

    if (!current.downloadId && candidate.downloadId) {
      return true;
    }

    return false;
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
