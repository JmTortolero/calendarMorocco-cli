import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { Header } from './components/header/header';
import { BackendStatus, CompetitionCatalog, SeasonCatalog } from './core/services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly backendStatus = inject(BackendStatus);
  private readonly competitionCatalog = inject(CompetitionCatalog);
  private readonly seasonCatalog = inject(SeasonCatalog);

  startupChecking = signal(true);
  readonly backendUnavailable = this.backendStatus.isUnavailable;

  async ngOnInit(): Promise<void> {
    await this.checkBackendOnStartup();
  }

  private async checkBackendOnStartup(): Promise<void> {
    this.startupChecking.set(true);

    try {
      await firstValueFrom(
        this.http.get('/actuator/health').pipe(
          timeout(3000),
        ),
      );

      await Promise.all([
        this.competitionCatalog.loadCompetitions(),
        this.seasonCatalog.loadSeasons(),
      ]);

      this.backendStatus.markAvailable();
    } catch (error: unknown) {
      console.error('Startup backend check failed', error);
      this.backendStatus.markUnavailable();
    } finally {
      this.startupChecking.set(false);
    }
  }
}
