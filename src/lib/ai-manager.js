// AI Manager - Abstraction layer for multiple LLM providers
// Supports: OpenAI, Claude, Gemini, DeepSeek, Ollama, etc.

class AIManager {
  constructor() {
    this.providers = new Map();
    this.defaultTimeout = 30000;
  }

  // Register a new AI provider
  registerProvider(name, provider) {
    this.providers.set(name, provider);
  }

  // Generic method to call any AI
  async callAI(provider, model, prompt, options = {}) {
    const aiProvider = this.providers.get(provider);
    if (!aiProvider) {
      throw new Error(`Provider ${provider} not registered`);
    }

    try {
      const response = await aiProvider.complete(model, prompt, options);
      return this.parseResponse(response);
    } catch (error) {
      console.error(`Error calling ${provider}:`, error);
      throw error;
    }
  }

  // Parse AI response to ensure consistent format
  parseResponse(response) {
    // Try to extract JSON from response
    try {
      let parsed;
      
      // If response is already an object
      if (typeof response === 'object') {
        parsed = response;
      } else {
        // Try to find JSON in string
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      }
      
      // Fix common field name errors
      if (parsed.respuesta && !parsed.accion) {
        parsed.accion = parsed.respuesta;
        delete parsed.respuesta;
      }
      
      return parsed;
      
    } catch (e) {
      return {
        accion: 'error',
        valor: null,
        razon: 'Failed to parse AI response: ' + e.message
      };
    }
  }
}

// OpenAI Provider
class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
  }

  async complete(model, prompt, options = {}) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are playing Truco Argentino. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 150
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
  }
}

// Claude Provider (Anthropic)
class ClaudeProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async complete(model, prompt, options = {}) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.7,
        system: 'You are playing Truco Argentino. Always respond in valid JSON format.'
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.content[0].text;
  }
}

// Ollama Provider (Local)
class OllamaProvider {
  constructor(baseURL = 'http://localhost:11434') {
    this.baseURL = baseURL;
  }

  async complete(model, prompt, options = {}) {
    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama2',
        prompt: `You are playing Truco Argentino. Always respond in valid JSON format.\n\n${prompt}`,
        stream: false,
        options: {
          temperature: options.temperature || 0.7
        }
      })
    });

    const data = await response.json();
    return data.response;
  }
}

// DeepSeek Provider
class DeepSeekProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
  }

  async complete(model, prompt, options = {}) {
    // Similar to OpenAI format
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are playing Truco Argentino. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 150
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
  }
}

// Gemini Provider
class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async complete(model, prompt, options = {}) {
    const response = await fetch(`${this.baseURL}/${model || 'gemini-pro'}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are playing Truco Argentino. Always respond in valid JSON format.\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 150
        }
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.candidates[0].content.parts[0].text;
  }
}

// Export everything
export { AIManager, OpenAIProvider, ClaudeProvider, OllamaProvider, DeepSeekProvider, GeminiProvider };
