import { inject } from '@angular/core';
import { withViewTransitions } from '@angular/router';

/**
 * 🔥 Angular 21: Modern view transitions helper
 * Provides smooth transitions between route changes
 */
export const VIEW_TRANSITIONS_CONFIG = withViewTransitions({
  skipInitialTransition: true
});

/**
 * Angular 21: Utility for programmatic view transitions
 */
export function createSmoothTransition() {
  return (callback: () => void | Promise<void>) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Native View Transitions API (for modern browsers)
      return (document as any).startViewTransition(callback);
    } else {
      // Fallback for older browsers
      return Promise.resolve(callback());
    }
  };
}

/**
 * Angular 21: Loading state manager with transitions
 */
export class LoadingStateManager {
  private isLoading = false;

  get loading() { return this.isLoading; }

  async withLoading<T>(operation: () => Promise<T>): Promise<T> {
    const transition = createSmoothTransition();

    this.isLoading = true;
    try {
      const result = await operation();
      await transition(() => {});
      return result;
    } finally {
      this.isLoading = false;
    }
  }
}
