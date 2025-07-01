export function classifyQueryIntent(query: string): 'definition' | 'fact' | 'summary' | 'broad' {
    if (/define|what is/i.test(query)) return 'definition';
    if (/when|who|how much|where/i.test(query)) return 'fact';
    if (/summarize|summary|overview/i.test(query)) return 'summary';
    return 'broad';
  }
  