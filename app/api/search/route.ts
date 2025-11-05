import { NextRequest, NextResponse } from 'next/server';
import { COURT_SOURCES, buildSourceUrl, parseHtmlForSource, ResultItem } from '../../../lib/sources';

export const dynamic = 'force-dynamic';

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; JurisAgentBR/1.0; +https://example.local)' } });
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all') as 'all' | 'temas' | 'vinculantes';
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], errors: [{ sourceId: 'input', sourceName: 'Valida??o', error: 'Consulta muito curta' }], tookMs: 0 }, { status: 400 });
  }

  const started = Date.now();
  const tasks = COURT_SOURCES.map(async (src) => {
    const url = buildSourceUrl(src, q, type);
    try {
      // Try fetch and parse a few top results; if fails, fallback to just the search URL
      const res = await fetchWithTimeout(url, src.timeoutMs ?? 8000);
      const text = await res.text();
      const items = parseHtmlForSource(src, text, url).slice(0, src.maxResults ?? 5);
      if (items.length === 0) {
        // Return a single item pointing to the search results page
        return [{ title: 'Abrir resultados no site', snippet: '', url, sourceId: src.id, sourceName: src.name } as ResultItem];
      }
      return items;
    } catch (err: any) {
      return { error: { sourceId: src.id, sourceName: src.name, error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'falha') }, url } as any;
    }
  });

  const settled = await Promise.all(tasks);
  const results: ResultItem[] = [];
  const errors: { sourceId: string; sourceName: string; error: string }[] = [];
  for (const entry of settled) {
    if (Array.isArray(entry)) {
      results.push(...entry);
    } else if (entry && entry.error) {
      errors.push(entry.error);
      // Still provide the direct search link as a fallback result
      if (entry.url) {
        const src = COURT_SOURCES.find(s => s.id === entry.error.sourceId)!;
        results.push({ title: 'Abrir resultados no site', snippet: '', url: entry.url, sourceId: src.id, sourceName: src.name });
      }
    }
  }

  const tookMs = Date.now() - started;
  return NextResponse.json({ results, errors, tookMs }, { status: 200 });
}
