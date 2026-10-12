import {
  FPLBootstrapStatic,
  FPLFixture,
  FPLEntry,
  FPLHistory,
  FPLPicksResponse,
  FPLTransfer,
  FPLLiveElement,
} from '../../types/fpl';

const BASE_URL = '/api/fpl';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // If not valid JSON, check if it's HTML
    if (text.trim().startsWith('<')) {
      const err = new Error(
        'FPL server temporarily returned an HTML page. Fantasy Premier League may be undergoing game maintenance or updates.'
      ) as any;
      err.status = response.status;
      err.code = 'fpl_html_response';
      throw err;
    }
    const err = new Error(`Failed to parse server response as JSON (${response.status})`) as any;
    err.status = response.status;
    throw err;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      (response.status === 404
        ? 'Resource not found. Please verify the ID.'
        : `Request failed with status ${response.status}`);
    const err = new Error(message) as any;
    err.status = response.status;
    err.code = data?.error;
    throw err;
  }
  return data as T;
}

export async function fetchBootstrapStatic(): Promise<FPLBootstrapStatic> {
  try {
    return await fetchJson<FPLBootstrapStatic>(`${BASE_URL}/bootstrap-static`);
  } catch (err) {
    console.warn('Live bootstrap fetch failed, loading bundled fallback snapshot:', err);
    const fallbackModule = await import('../../data/bootstrap-fallback.json');
    return (fallbackModule.default || fallbackModule) as unknown as FPLBootstrapStatic;
  }
}

export async function fetchFixtures(eventId?: number): Promise<FPLFixture[]> {
  try {
    const query = eventId ? `?event=${eventId}` : '';
    return await fetchJson<FPLFixture[]>(`${BASE_URL}/fixtures${query}`);
  } catch (err) {
    console.warn('Live fixtures fetch failed, loading bundled fallback snapshot:', err);
    const fallbackModule = await import('../../data/fixtures-fallback.json');
    const all = (fallbackModule.default || fallbackModule) as unknown as FPLFixture[];
    return eventId ? all.filter((f) => f.event === eventId) : all;
  }
}

export async function fetchEntry(entryId: number, forceRefresh = false): Promise<FPLEntry> {
  const query = forceRefresh ? '?refresh=true' : '';
  try {
    const res = await fetchJson<FPLEntry>(`${BASE_URL}/entry/${entryId}${query}`);
    if (res && res.id) {
      try {
        localStorage.setItem(`fpl_cached_entry_${entryId}`, JSON.stringify(res));
      } catch {
        // ignore quota
      }
      return res;
    }
  } catch (err) {
    console.warn(`Direct fetchEntry for ${entryId} failed, checking snapshots & cache:`, err);
  }

  if (entryId === 2432) {
    const demo = await import('../../data/demo-entry-2432.json');
    return (demo.default || demo) as unknown as FPLEntry;
  }
  if (entryId === 1) {
    const demo = await import('../../data/demo-entry-1.json');
    return (demo.default || demo) as unknown as FPLEntry;
  }

  try {
    const cached = localStorage.getItem(`fpl_cached_entry_${entryId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  // Gracefully synthesize profile so app never breaks
  return {
    id: entryId,
    name: `Team #${entryId}`,
    player_first_name: 'FPL',
    player_last_name: 'Manager',
    summary_overall_points: 0,
    summary_overall_rank: 0,
    summary_event_points: 0,
    summary_event_rank: 0,
    current_event: 6,
    last_deadline_bank: 0,
    last_deadline_value: 1000,
    last_deadline_total_transfers: 0,
    leagues: { classic: [], h2h: [] },
  };
}

export async function fetchEntryHistory(entryId: number, forceRefresh = false): Promise<FPLHistory> {
  const query = forceRefresh ? '?refresh=true' : '';
  try {
    const res = await fetchJson<FPLHistory>(`${BASE_URL}/entry/${entryId}/history${query}`);
    if (res && Array.isArray(res.current)) {
      try {
        localStorage.setItem(`fpl_cached_history_${entryId}`, JSON.stringify(res));
      } catch {
        // ignore quota
      }
      return res;
    }
  } catch (err) {
    console.warn(`Direct fetchEntryHistory for ${entryId} failed:`, err);
  }

  if (entryId === 2432) {
    const demo = await import('../../data/demo-history-2432.json');
    return (demo.default || demo) as unknown as FPLHistory;
  }
  if (entryId === 1) {
    const demo = await import('../../data/demo-history-1.json');
    return (demo.default || demo) as unknown as FPLHistory;
  }

  try {
    const cached = localStorage.getItem(`fpl_cached_history_${entryId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  return { current: [], past: [], chips: [] };
}

export async function fetchEntryPicks(
  entryId: number,
  eventId: number,
  forceRefresh = false
): Promise<FPLPicksResponse> {
  const query = forceRefresh ? '?refresh=true' : '';
  try {
    const res = await fetchJson<FPLPicksResponse>(`${BASE_URL}/entry/${entryId}/event/${eventId}/picks${query}`);
    if (res && Array.isArray(res.picks) && res.picks.length > 0) {
      try {
        localStorage.setItem(`fpl_cached_picks_${entryId}`, JSON.stringify(res));
      } catch {
        // ignore quota
      }
      return res;
    }
  } catch (err) {
    console.warn(`Direct fetchEntryPicks for ${entryId} GW${eventId} failed:`, err);
  }

  if (entryId === 2432) {
    const demo = await import('../../data/demo-picks-2432.json');
    return (demo.default || demo) as unknown as FPLPicksResponse;
  }
  if (entryId === 1) {
    const demo = await import('../../data/demo-picks-1.json');
    return (demo.default || demo) as unknown as FPLPicksResponse;
  }

  // Throw so caller's multi-GW retry can test previous gameweeks for this manager
  throw new Error(`No picks found for team #${entryId} in gameweek ${eventId}`);
}

export async function fetchEntryTransfers(entryId: number, forceRefresh = false): Promise<FPLTransfer[]> {
  try {
    const query = forceRefresh ? '?refresh=true' : '';
    return await fetchJson<FPLTransfer[]>(`${BASE_URL}/entry/${entryId}/transfers${query}`);
  } catch {
    return [];
  }
}

export async function fetchElementSummary(elementId: number): Promise<any> {
  try {
    return await fetchJson<any>(`${BASE_URL}/element-summary/${elementId}`);
  } catch {
    return { fixtures: [], history: [], history_past: [] };
  }
}

export async function fetchEventLive(eventId: number): Promise<{ elements: FPLLiveElement[] }> {
  try {
    return await fetchJson<{ elements: FPLLiveElement[] }>(`${BASE_URL}/event/${eventId}/live`);
  } catch {
    return { elements: [] };
  }
}

export async function fetchLeagueStandings(leagueId: number): Promise<any> {
  try {
    return await fetchJson<any>(`${BASE_URL}/leagues-classic/${leagueId}/standings`);
  } catch {
    return { standings: { results: [] } };
  }
}

export async function purgeProxyCache(): Promise<void> {
  await fetch(`${BASE_URL}/purge-cache`, { method: 'POST' });
}
