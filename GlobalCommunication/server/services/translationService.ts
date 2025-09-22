export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export class TranslationService {
  private baseUrl = 'https://api.mymemory.translated.net/get';

  async translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslationResult> {
    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error(`Translation failed: ${data.responseDetails || 'Unknown error'}`);
      }

      return {
        translatedText: data.responseData.translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      // MyMemory API can auto-detect language when source is empty
      const url = `${this.baseUrl}?q=${encodeURIComponent(text)}&langpair=|en-GB`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Language detection error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract detected language from matches if available
      if (data.matches && data.matches.length > 0) {
        return data.matches[0].source || 'en-GB';
      }
      
      return 'en-GB'; // fallback to English
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en-GB'; // fallback to English
    }
  }
}

export const translationService = new TranslationService();
