export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchResult = {
  answer: string;
  results: SearchHit[];
  note?: string;
};

export type SearchOptions = {
  language?: "de" | "en";
  maxResults?: number;
  includeAnswer?: boolean | "basic" | "advanced";
  searchDepth?: "basic" | "fast" | "ultra-fast" | "advanced";
};

export class SearchProviderError extends Error {
  constructor(message = "Search provider failed") {
    super(message);
    this.name = "SearchProviderError";
  }
}

export async function searchWeb(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      answer: "",
      results: [],
      note: "Web search is not configured. Set TAVILY_API_KEY.",
    };
  }

  const upstream = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options.searchDepth ?? "basic",
      max_results: options.maxResults ?? 5,
      include_answer: options.includeAnswer ?? true,
      ...(options.language ? { language: options.language } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!upstream.ok) {
    throw new SearchProviderError();
  }

  const data = (await upstream.json()) as {
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return {
    answer: data.answer ?? "",
    results: (data.results ?? []).map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.content ?? "",
    })),
  };
}

export async function extractWebsite(
  url: string,
  options: { language?: "de" | "en" } = {},
): Promise<{ url: string; content: string } | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const query =
    options.language === "en"
      ? "What does the company do? Product, team, customers, traction."
      : "Was macht das Unternehmen? Produkt, Team, Kunden, Traktion.";

  const upstream = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      api_key: apiKey,
      urls: [url],
      query,
      chunks_per_source: 5,
      extract_depth: "advanced",
      format: "text",
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!upstream.ok) return null;

  const data = (await upstream.json()) as {
    results?: Array<{ url?: string; raw_content?: string }>;
  };
  const content = data.results?.[0]?.raw_content?.trim() ?? "";
  if (!content) return null;

  const clipped = content.length > 2_400 ? `${content.slice(0, 2_397).trim()}…` : content;
  return { url: data.results?.[0]?.url || url, content: clipped };
}
