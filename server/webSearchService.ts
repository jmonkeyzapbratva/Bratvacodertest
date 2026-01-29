interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  isReal: boolean;
  provider: "brave" | "tavily" | "fallback";
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

interface BraveSearchResponse {
  web?: {
    results?: BraveSearchResult[];
  };
  query?: {
    original: string;
  };
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilySearchResponse {
  results?: TavilySearchResult[];
  answer?: string;
}

class WebSearchService {
  private cache: Map<string, { results: SearchResponse; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async search(query: string, maxResults = 10): Promise<SearchResponse> {
    const start = Date.now();
    const cacheKey = `${query}:${maxResults}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.results;
    }

    try {
      // Try Brave Search API first (best for AI agents)
      const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (braveApiKey) {
        const braveResults = await this.searchBrave(query, maxResults, braveApiKey);
        if (braveResults.length > 0) {
          const response: SearchResponse = {
            query,
            results: braveResults,
            totalResults: braveResults.length,
            searchTime: Date.now() - start,
            isReal: true,
            provider: "brave",
          };
          this.cache.set(cacheKey, { results: response, timestamp: Date.now() });
          return response;
        }
      }

      // Try Tavily as second option (AI-native search)
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (tavilyApiKey) {
        const tavilyResults = await this.searchTavily(query, maxResults, tavilyApiKey);
        if (tavilyResults.length > 0) {
          const response: SearchResponse = {
            query,
            results: tavilyResults,
            totalResults: tavilyResults.length,
            searchTime: Date.now() - start,
            isReal: true,
            provider: "tavily",
          };
          this.cache.set(cacheKey, { results: response, timestamp: Date.now() });
          return response;
        }
      }

      // Fallback to static programming resources
      console.warn("[WebSearch] No search API configured, using fallback resources");
      const fallbackResults = this.getProgrammingResources(query);
      const response: SearchResponse = {
        query,
        results: fallbackResults.slice(0, maxResults),
        totalResults: fallbackResults.length,
        searchTime: Date.now() - start,
        isReal: false,
        provider: "fallback",
      };

      this.cache.set(cacheKey, { results: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error("[WebSearch] Error:", error);
      
      const fallback = this.getProgrammingResources(query);
      return {
        query,
        results: fallback.slice(0, maxResults),
        totalResults: fallback.length,
        searchTime: Date.now() - start,
        isReal: false,
        provider: "fallback",
      };
    }
  }

  private async searchBrave(query: string, maxResults: number, apiKey: string): Promise<SearchResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${maxResults}&text_decorations=false`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn("[WebSearch] Brave API returned:", response.status);
        return [];
      }

      const data: BraveSearchResponse = await response.json();
      const results: SearchResult[] = [];

      if (data.web?.results) {
        for (const result of data.web.results) {
          if (results.length >= maxResults) break;
          
          try {
            const hostname = new URL(result.url).hostname;
            results.push({
              title: result.title,
              url: result.url,
              snippet: result.description || (result.extra_snippets?.[0] ?? ''),
              source: hostname,
            });
          } catch {}
        }
      }

      console.log(`[WebSearch] Brave returned ${results.length} results for: ${query}`);
      return results;
    } catch (error) {
      console.warn("[WebSearch] Brave search failed:", error);
      return [];
    }
  }

  private async searchTavily(query: string, maxResults: number, apiKey: string): Promise<SearchResult[]> {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          max_results: maxResults,
          search_depth: 'basic',
          include_answer: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn("[WebSearch] Tavily API returned:", response.status);
        return [];
      }

      const data: TavilySearchResponse = await response.json();
      const results: SearchResult[] = [];

      if (data.results) {
        for (const result of data.results) {
          if (results.length >= maxResults) break;
          
          try {
            const hostname = new URL(result.url).hostname;
            results.push({
              title: result.title,
              url: result.url,
              snippet: result.content,
              source: hostname,
            });
          } catch {}
        }
      }

      console.log(`[WebSearch] Tavily returned ${results.length} results for: ${query}`);
      return results;
    } catch (error) {
      console.warn("[WebSearch] Tavily search failed:", error);
      return [];
    }
  }

  private getProgrammingResources(query: string): SearchResult[] {
    const keywords = query.toLowerCase();
    const results: SearchResult[] = [];

    if (keywords.includes('react') || keywords.includes('frontend')) {
      results.push(
        { title: 'React Documentation', url: 'https://react.dev', snippet: 'Documentação oficial do React para construir interfaces de usuário', source: 'react.dev' },
        { title: 'React Hooks', url: 'https://react.dev/reference/react', snippet: 'Referência completa dos Hooks do React', source: 'react.dev' }
      );
    }

    if (keywords.includes('node') || keywords.includes('backend') || keywords.includes('express')) {
      results.push(
        { title: 'Node.js Documentation', url: 'https://nodejs.org/docs', snippet: 'Documentação oficial do Node.js', source: 'nodejs.org' },
        { title: 'Express.js Guide', url: 'https://expressjs.com/guide', snippet: 'Guia do framework Express para Node.js', source: 'expressjs.com' }
      );
    }

    if (keywords.includes('typescript') || keywords.includes('ts')) {
      results.push(
        { title: 'TypeScript Handbook', url: 'https://typescriptlang.org/docs', snippet: 'Guia completo do TypeScript', source: 'typescriptlang.org' }
      );
    }

    if (keywords.includes('postgres') || keywords.includes('sql') || keywords.includes('database') || keywords.includes('banco')) {
      results.push(
        { title: 'PostgreSQL Documentation', url: 'https://postgresql.org/docs', snippet: 'Documentação do PostgreSQL', source: 'postgresql.org' },
        { title: 'Drizzle ORM', url: 'https://orm.drizzle.team', snippet: 'ORM TypeScript para SQL databases', source: 'drizzle.team' }
      );
    }

    if (keywords.includes('tailwind') || keywords.includes('css') || keywords.includes('estilo')) {
      results.push(
        { title: 'Tailwind CSS', url: 'https://tailwindcss.com/docs', snippet: 'Framework CSS utility-first', source: 'tailwindcss.com' }
      );
    }

    if (keywords.includes('whatsapp') || keywords.includes('bot')) {
      results.push(
        { title: 'Baileys WhatsApp API', url: 'https://github.com/WhiskeySockets/Baileys', snippet: 'Biblioteca para bots WhatsApp em Node.js', source: 'github.com' },
        { title: 'whatsapp-web.js', url: 'https://wwebjs.dev', snippet: 'Cliente WhatsApp Web para Node.js', source: 'wwebjs.dev' }
      );
    }

    if (keywords.includes('api') || keywords.includes('rest')) {
      results.push(
        { title: 'REST API Design', url: 'https://restfulapi.net', snippet: 'Melhores práticas para design de APIs REST', source: 'restfulapi.net' }
      );
    }

    if (keywords.includes('openai') || keywords.includes('gpt') || keywords.includes('ai') || keywords.includes('llm')) {
      results.push(
        { title: 'OpenAI API Reference', url: 'https://platform.openai.com/docs/api-reference', snippet: 'Documentação oficial da API da OpenAI', source: 'platform.openai.com' },
        { title: 'OpenAI Cookbook', url: 'https://cookbook.openai.com', snippet: 'Exemplos e guias para usar a API da OpenAI', source: 'cookbook.openai.com' }
      );
    }

    if (keywords.includes('stripe') || keywords.includes('pagamento') || keywords.includes('payment')) {
      results.push(
        { title: 'Stripe Documentation', url: 'https://stripe.com/docs', snippet: 'Documentação completa da API do Stripe', source: 'stripe.com' }
      );
    }

    if (keywords.includes('vercel') || keywords.includes('deploy') || keywords.includes('hospedagem')) {
      results.push(
        { title: 'Vercel Documentation', url: 'https://vercel.com/docs', snippet: 'Plataforma de deploy para aplicações web', source: 'vercel.com' }
      );
    }

    if (results.length === 0) {
      results.push(
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', snippet: 'Documentação completa para desenvolvimento web', source: 'developer.mozilla.org' },
        { title: 'Stack Overflow', url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`, snippet: 'Comunidade de programadores com milhões de respostas', source: 'stackoverflow.com' },
        { title: 'GitHub', url: `https://github.com/search?q=${encodeURIComponent(query)}`, snippet: 'Encontre repositórios e código open source', source: 'github.com' }
      );
    }

    return results;
  }

  async searchDocumentation(technology: string): Promise<SearchResult[]> {
    const response = await this.search(technology, 5);
    return response.results;
  }

  async searchErrorSolution(errorMessage: string): Promise<SearchResult[]> {
    const query = `${errorMessage} solution fix`;
    const response = await this.search(query, 5);
    const results = [...response.results];
    
    results.push({
      title: `Stack Overflow: ${errorMessage.slice(0, 50)}...`,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(errorMessage)}`,
      snippet: 'Encontre soluções para este erro no Stack Overflow',
      source: 'stackoverflow.com',
    });

    return results;
  }

  async fetchPageContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BRATVACODER/1.0 AI Agent',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;

      const html = await response.text();
      // Basic HTML to text conversion
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text.slice(0, 10000); // Limit content size
    } catch (error) {
      console.warn(`[WebSearch] Failed to fetch content from ${url}:`, error);
      return null;
    }
  }
}

export const webSearchService = new WebSearchService();
