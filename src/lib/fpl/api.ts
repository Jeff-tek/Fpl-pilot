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
  return fetchJson<FPLBootstrapStatic>(`${BASE_URL}/bootstrap-static`);
}

export async function fetchFixtures(eventId?: number): Promise<FPLFixture[]> {
  const query = eventId ? `?event=${eventId}` : '';
  return fetchJson<FPLFixture[]>(`${BASE_URL}/fixtures${query}`);
}

export async function fetchEntry(entryId: number, forceRefresh = false): Promise<FPLEntry> {
  const query = forceRefresh ? '?refresh=true' : '';
  return fetchJson<FPLEntry>(`${BASE_URL}/entry/${entryId}${query}`);
}

export async function fetchEntryHistory(entryId: number, forceRefresh = false): Promise<FPLHistory> {
  const query = forceRefresh ? '?refresh=true' : '';
  return fetchJson<FPLHistory>(`${BASE_URL}/entry/${entryId}/history${query}`);
}

export async function fetchEntryPicks(
  entryId: number,
  eventId: number,
  forceRefresh = false
): Promise<FPLPicksResponse> {
  const query = forceRefresh ? '?refresh=true' : '';
  return fetchJson<FPLPicksResponse>(`${BASE_URL}/entry/${entryId}/event/${eventId}/picks${query}`);
}

export async function fetchEntryTransfers(entryId: number, forceRefresh = false): Promise<FPLTransfer[]> {
  const query = forceRefresh ? '?refresh=true' : '';
  return fetchJson<FPLTransfer[]>(`${BASE_URL}/entry/${entryId}/transfers${query}`);
}

export async function fetchElementSummary(elementId: number): Promise<any> {
  return fetchJson<any>(`${BASE_URL}/element-summary/${elementId}`);
}

export async function fetchEventLive(eventId: number): Promise<{ elements: FPLLiveElement[] }> {
  return fetchJson<{ elements: FPLLiveElement[] }>(`${BASE_URL}/event/${eventId}/live`);
}

export async function fetchLeagueStandings(leagueId: number): Promise<any> {
  return fetchJson<any>(`${BASE_URL}/leagues-classic/${leagueId}/standings`);
}

export async function purgeProxyCache(): Promise<void> {
  await fetch(`${BASE_URL}/purge-cache`, { method: 'POST' });
}
