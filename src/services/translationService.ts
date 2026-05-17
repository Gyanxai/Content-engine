export const LANGUAGES = [
  { code: 'hi', name: 'Hindi',     script: 'हिन्दी'   },
  { code: 'bn', name: 'Bengali',   script: 'বাংলা'    },
  { code: 'te', name: 'Telugu',    script: 'తెలుగు'   },
  { code: 'ta', name: 'Tamil',     script: 'தமிழ்'    },
  { code: 'mr', name: 'Marathi',   script: 'मराठी'    },
  { code: 'gu', name: 'Gujarati',  script: 'ગુજરાતી'  },
  { code: 'kn', name: 'Kannada',   script: 'ಕನ್ನಡ'    },
  { code: 'ml', name: 'Malayalam', script: 'മലയാളം'   },
  { code: 'pa', name: 'Punjabi',   script: 'ਪੰਜਾਬੀ'   },
  { code: 'ur', name: 'Urdu',      script: 'اردو'     },
];

// Session-level cache: key = `${langCode}::${text}`
const _cache = new Map<string, string>();

function cacheKey(langCode: string, text: string): string {
  return `${langCode}::${text}`;
}

async function translateText(text: string, langCode: string): Promise<string> {
  const key = cacheKey(langCode, text);
  if (_cache.has(key)) return _cache.get(key)!;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
  const res = await fetch(url);
  const json = await res.json();
  const result: string = json?.responseData?.translatedText || '';

  _cache.set(key, result);
  return result;
}

export async function translateAll(
  text: string,
  onProgress?: (lang: string, result: string) => void,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    const translated = await translateText(text, lang.code);
    results[lang.code] = translated;
    onProgress?.(lang.code, translated);
  }
  return results;
}

export function clearTranslationCache(): void {
  _cache.clear();
}
