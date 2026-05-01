class AIService {
  private generator: any = null;
  private isInitializing = false;

  async init() {
    if (this.generator || this.isInitializing) return;
    this.isInitializing = true;
    console.log('🤖 AI Service: Initializing local model...');
    try {
      // Dynamic import to prevent crash on page load
      const { pipeline, env } = await import('@xenova/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      this.generator = await pipeline('text-generation', 'Xenova/tiny-random-gpt2'); 
      console.log('✅ AI Service: Local model ready.');
    } catch (err) {
      console.error('❌ AI Service: Initialization failed:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  async suggestTopics(chapterName: string): Promise<string[]> {
    try {
      await this.init();
      if (!this.generator) {
        console.warn('⚠️ AI Service: Generator not available, using fallback.');
        return ['Key Concepts', 'Standard Examples', 'Practice Set'];
      }

      const prompt = `Chapter: ${chapterName}\nSuggested Topics:`;
      const output = await this.generator(prompt, {
        max_new_tokens: 20,
        temperature: 0.7,
        do_sample: true,
      });

      const text = output[0].generated_text;
      const suggestions = text.split(':')[1]?.split(',').map((s: string) => s.trim()) || [];
      return suggestions.length > 0 ? suggestions : ['Concept A', 'Concept B', 'Example Set'];
    } catch (err) {
      console.error('AI Suggestion error:', err);
      return ['Basic Concepts', 'Practice Questions', 'Summary'];
    }
  }
}

export const aiService = new AIService();
