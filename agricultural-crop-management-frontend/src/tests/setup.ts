// Test setup file for Vitest
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global test configuration
// Add any global mocks or setup here
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverMock as typeof ResizeObserver;


vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: any) => {
      if (typeof options === 'string') return options;
      // Handle the pagination translation explicitly if needed, or just return the default value
      if (key === 'admin.marketplace.components.pagination.showing') {
        return `Showing ${options?.start} to ${options?.end} of ${options?.total}`;
      }
      return options?.defaultValue ?? key;
    },
    isLoading: false,
    locale: 'en-US'
  }),
}));