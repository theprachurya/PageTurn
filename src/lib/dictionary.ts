export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

const lookupCache = new Map<string, DictionaryDefinition | null>();

export async function lookupWord(word: string): Promise<DictionaryDefinition | null> {
  const cleanWord = word.trim().toLowerCase().replace(/[^a-z-]/g, "");
  
  if (!cleanWord) return null;
  if (lookupCache.has(cleanWord)) {
    return lookupCache.get(cleanWord) || null;
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
    
    if (!res.ok) {
      lookupCache.set(cleanWord, null);
      return null;
    }

    const data = await res.json();
    if (data && data.length > 0) {
      const definition = data[0] as DictionaryDefinition;
      lookupCache.set(cleanWord, definition);
      return definition;
    }
    
    lookupCache.set(cleanWord, null);
    return null;
  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    return null;
  }
}
