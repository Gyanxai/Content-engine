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

async function translateText(text: string, langCode: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.responseData?.translatedText || '';
}

export async function translateAll(
  text: string,
  onProgress?: (lang: string, result: string) => void
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    const translated = await translateText(text, lang.code);
    results[lang.code] = translated;
    onProgress?.(lang.code, translated);
  }
  return results;
}
