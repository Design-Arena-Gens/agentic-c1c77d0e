"use client";

import { useEffect, useMemo, useState } from 'react';

type Result = {
  title: string;
  snippet: string;
  url: string;
  sourceId: string;
  sourceName: string;
};

type SearchResponse = {
  results: Result[];
  errors: { sourceId: string; sourceName: string; error: string }[];
  tookMs: number;
};

export default function HomePage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<'all' | 'temas' | 'vinculantes'>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ q, type });
      const res = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SearchResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Falha na busca');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prefill example for quick demo
    if (typeof window !== 'undefined' && window.location.search === '') {
      setQ('tema 246');
    }
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Agente IA ? Jurisprud?ncia BR</h1>
      <p className="small">Pesquise jurisprud?ncia, temas e decis?es vinculantes no STF, STJ, TST, TRFs, TRTs e TJs.</p>

      <div className="grid">
        <form className="card" onSubmit={onSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span>Consulta</span>
              <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Ex.: tema 246, transcend?ncia, s?mula 331, repetitivo" />
            </label>
            <label style={{ display: 'grid', gap: 8 }}>
              <span>Escopo</span>
              <select className="select" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="temas">Temas</option>
                <option value="vinculantes">Decis?es vinculantes</option>
              </select>
            </label>
            <button className="btn" disabled={!canSearch || loading} type="submit">
              {loading ? 'Buscando?' : 'Buscar'}
            </button>
            <div className="small">Dica: clique no nome do tribunal para abrir a busca completa no site oficial.</div>
          </div>
        </form>

        <section className="card">
          {!data && !error && <div className="small">Digite sua consulta e clique em Buscar.</div>}
          {error && <div style={{ color: '#ff9393' }}>Erro: {error}</div>}
          {data && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="small">Tempo total: {data.tookMs.toFixed(0)} ms</div>
              {data.results.length === 0 && <div>Nenhum resultado parseado. Voc? ainda pode abrir as pesquisas por tribunal abaixo.</div>}
              <Results data={data} />
            </div>
          )}
        </section>
      </div>

      <footer className="small" style={{ opacity: 0.8 }}>
        Fontes oficiais. Este agente automatiza consultas e exibe liga??es p?blicas; valide sempre no tribunal.
      </footer>
    </div>
  );
}

function Results({ data }: { data: SearchResponse }) {
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; items: Result[] }>();
    for (const r of data.results) {
      const g = m.get(r.sourceId) ?? { name: r.sourceName, items: [] };
      g.items.push(r);
      m.set(r.sourceId, g);
    }
    return Array.from(m.entries());
  }, [data]);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {grouped.map(([sourceId, group]) => (
        <div key={sourceId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="badge">{group.name}</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {group.items.map((it, idx) => (
              <a key={idx} href={it.url} target="_blank" rel="noreferrer" className="card" style={{ display: 'block' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{it.title || it.url}</div>
                {it.snippet && <div className="small" style={{ opacity: 0.9 }}>{it.snippet}</div>}
                <div className="small" style={{ opacity: 0.7, marginTop: 6 }}>{new URL(it.url).hostname}</div>
              </a>
            ))}
          </div>
        </div>
      ))}

      {data.errors.length > 0 && (
        <div>
          <div style={{ marginTop: 8, marginBottom: 8 }}>Fontes com erro</div>
          <ul>
            {data.errors.map((e, i) => (
              <li key={i} className="small" style={{ color: '#e5b96b' }}>{e.sourceName}: {e.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
