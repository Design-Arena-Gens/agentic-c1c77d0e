import * as cheerio from 'cheerio';

export type SourceType = 'all' | 'temas' | 'vinculantes';

export type ResultItem = {
  title: string;
  snippet: string;
  url: string;
  sourceId: string;
  sourceName: string;
};

export type CourtSource = {
  id: string;
  name: string;
  build: (q: string, type: SourceType) => string;
  parse?: (html: string, baseUrl: string) => ResultItem[];
  maxResults?: number;
  timeoutMs?: number;
};

function enc(s: string) { return encodeURIComponent(s); }

// Conservative parsers for a few major courts; others fall back to direct link
const STF: CourtSource = {
  id: 'stf', name: 'STF ? Supremo Tribunal Federal',
  build: (q, type) => `https://jurisprudencia.stf.jus.br/pages/search?sinonimo=false&plural=false&stemmer=true&busca=${enc(q)}`,
  parse: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: ResultItem[] = [];
    $('div.resultado, div.card, li').each((_, el) => {
      const a = $(el).find('a').first();
      const title = a.text().trim();
      const href = a.attr('href') || '';
      if (href && title) {
        const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        const snippet = $(el).find('p, span, small').first().text().trim();
        items.push({ title, snippet, url, sourceId: STF.id, sourceName: STF.name });
      }
    });
    return dedupe(items);
  },
  maxResults: 6
};

const STJ: CourtSource = {
  id: 'stj', name: 'STJ ? Superior Tribunal de Justi?a',
  build: (q, type) => `https://scon.stj.jus.br/SCON/decisoes/toc.jsp?livre=${enc(q)}`,
  parse: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: ResultItem[] = [];
    $('a').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      const text = a.text().trim();
      if (/processo|ac?rd|decis|juris/i.test(text) && href) {
        const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        const snippet = a.closest('tr, li, div').find('td, p, span').slice(0, 1).text().trim();
        items.push({ title: text, snippet, url, sourceId: STJ.id, sourceName: STJ.name });
      }
    });
    return dedupe(items);
  },
  maxResults: 6
};

const TST: CourtSource = {
  id: 'tst', name: 'TST ? Tribunal Superior do Trabalho',
  build: (q, type) => `https://jurisprudencia.tst.jus.br/busca-unificada?q=${enc(q)}`,
  parse: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: ResultItem[] = [];
    $('a').each((_, el) => {
      const a = $(el);
      const text = a.text().trim();
      const href = a.attr('href') || '';
      if (href && /ac?rd|s?mula|OJ|precedente|juris/i.test(text)) {
        const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        const snippet = a.closest('div, li').find('p, span').first().text().trim();
        items.push({ title: text, snippet, url, sourceId: TST.id, sourceName: TST.name });
      }
    });
    return dedupe(items);
  },
  maxResults: 6
};

// Generic sources: return the search page; parsing may vary heavily per tribunal
function genericSource(id: string, name: string, base: string, qParam: string = 'q'): CourtSource {
  return {
    id, name,
    build: (q) => `${base}${base.includes('?') ? '&' : '?'}${qParam}=${enc(q)}`,
    parse: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: ResultItem[] = [];
      const candidates = $('a');
      candidates.each((_, el) => {
        const a = $(el);
        const text = a.text().trim();
        const href = a.attr('href') || '';
        if (!href || !text) return;
        if (/ac?rd|decis|ement|juris|tema|repet/i.test(text)) {
          const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          const snippet = a.closest('div, li, tr').find('p, span, td').first().text().trim();
          items.push({ title: text, snippet, url, sourceId: id, sourceName: name });
        }
      });
      return dedupe(items);
    },
    maxResults: 5,
    timeoutMs: 8000
  };
}

// Selection of TRFs, TRTs, and large TJs; easily extendable
const TRF1 = genericSource('trf1', 'TRF1 ? Tribunal Regional Federal da 1? Regi?o', 'https://portal.trf1.jus.br/portaltrf1/pesquisar.htm', 'query');
const TRF2 = genericSource('trf2', 'TRF2 ? Tribunal Regional Federal da 2? Regi?o', 'https://www10.trf2.jus.br/portal/pesquisa/', 's');
const TRF3 = genericSource('trf3', 'TRF3 ? Tribunal Regional Federal da 3? Regi?o', 'https://www.trf3.jus.br/pfma/public/pesquisa', 'q');
const TRF4 = genericSource('trf4', 'TRF4 ? Tribunal Regional Federal da 4? Regi?o', 'https://www.trf4.jus.br/busca/apresentar.php', 'q');
const TRF5 = genericSource('trf5', 'TRF5 ? Tribunal Regional Federal da 5? Regi?o', 'https://www.trf5.jus.br/busca/', 'q');
const TRF6 = genericSource('trf6', 'TRF6 ? Tribunal Regional Federal da 6? Regi?o', 'https://www.trf6.jus.br/portal/pesquisar', 'q');

const TRT2 = genericSource('trt2', 'TRT-2 ? Tribunal Regional do Trabalho da 2? Regi?o', 'https://www.trt2.jus.br/busca', 'q');
const TRT15 = genericSource('trt15', 'TRT-15 ? Tribunal Regional do Trabalho da 15? Regi?o', 'https://www.trt15.jus.br/busca', 'q');
const TRT3 = genericSource('trt3', 'TRT-3 ? Tribunal Regional do Trabalho da 3? Regi?o', 'https://portal.trt3.jus.br/internet/Biblioteca/pesquisa', 'SearchableText');

const TJSP = genericSource('tjsp', 'TJSP ? Tribunal de Justi?a de S?o Paulo', 'https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do', 'dados.busca');
const TJRJ = genericSource('tjrj', 'TJRJ ? Tribunal de Justi?a do Rio de Janeiro', 'https://www.tjrj.jus.br/consultas/jurisprudencia', 'texto');
const TJMG = genericSource('tjmg', 'TJMG ? Tribunal de Justi?a de Minas Gerais', 'https://www.tjmg.jus.br/portal/jurisprudencia/pesquisa-ementario.htm', 'palavraChave');

export const COURT_SOURCES: CourtSource[] = [
  STF, STJ, TST,
  TRF1, TRF2, TRF3, TRF4, TRF5, TRF6,
  TRT2, TRT15, TRT3,
  TJSP, TJRJ, TJMG
];

export function buildSourceUrl(src: CourtSource, q: string, type: SourceType): string {
  // For now we simply forward q. A future enhancement could specialize per type.
  return src.build(q, type);
}

export function parseHtmlForSource(src: CourtSource, html: string, baseUrl: string): ResultItem[] {
  if (src.parse) return src.parse(html, baseUrl);
  return [];
}

function dedupe(items: ResultItem[]): ResultItem[] {
  const seen = new Set<string>();
  const out: ResultItem[] = [];
  for (const it of items) {
    const key = `${it.sourceId}|${it.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}
