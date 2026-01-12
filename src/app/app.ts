import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header], // 🔥 Angular 21: Removed unused CommonModule
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
})
export class App implements OnInit {
  // 🔥 Angular 21: Signals for reactive state
  backendConnected = signal(false);
  showLoading = signal(true);

  // 🔥 Angular 21: Computed signals for derived state
  isReady = computed(() => this.backendConnected() && !this.showLoading());

  ngOnInit() {
    // Simulate connection check
    setTimeout(() => {
      this.backendConnected.set(true);
      this.showLoading.set(false);
    }, 1000);
  }
}
