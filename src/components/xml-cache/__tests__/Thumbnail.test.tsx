// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Thumbnail } from '../components/Thumbnail';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd: string, args: any) => {
    if (cmd === 'read_file_as_data_url') {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8z8AARQMGAGn3B7sTg6ylAAAAAElFTkSuQmCC';
    }
    return undefined;
  }),
}));

// Helper to trigger image error in jsdom
function triggerImageError(img: HTMLImageElement) {
  fireEvent.error(img);
}

describe('Thumbnail fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to data URL from backend when image fails to load', async () => {
    render(
      <Thumbnail
        src={"asset://localhost/fake.png"}
        alt="test"
        width={100}
        height={60}
        absolutePathForFallback={"D:/fake/path/fake.png"}
      />
    );
    // Trigger error to activate fallback
    const img = await screen.findByRole('img');
    triggerImageError(img as HTMLImageElement);
    // After fallback, the src should be a data URL
    await waitFor(() => {
      const updated = screen.getByRole('img');
      expect(updated.getAttribute('src')?.startsWith('data:image/png;base64,')).toBe(true);
    });
  });
});
