import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEntryPicks } from '../fpl/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchEntryPicks', () => {
  it('does not substitute demo picks when a custom team request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'fpl_maintenance' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(fetchEntryPicks(987654321, 6)).rejects.toThrow(
      'No picks found for team #987654321 in gameweek 6'
    );
  });
});
