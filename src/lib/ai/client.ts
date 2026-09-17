import { AISettings, AIProvider, AIFallbackEventDetail } from '@/types';

export interface LLMRequestOptions {
  systemPrompt?: string;
  userPrompt: string;
  settings: AISettings;
  modelType?: 'fast' | 'reasoning';
  responseFormat?: 'json' | 'text';
}

interface ProviderAttempt {
  provider: AIProvider;
  model: string;
  apiKey: string;
  isFallback: boolean;
  label: string;
}

export function getApiKeyForProvider(settings: AISettings, provider: AIProvider): string {
  const fromMap = settings.apiKeys?.[provider]?.trim();
  if (fromMap) return fromMap;
  if (settings.provider === provider && settings.apiKey?.trim()) {
    return settings.apiKey.trim();
  }
  return '';
}

export function getModelForProvider(
  settings: AISettings,
  provider: AIProvider,
  type: 'fast' | 'reasoning'
): string {
  const effectiveType = settings.useOnlyFastModels ? 'fast' : type;

  if (settings.models?.[provider]) {
    const configured = settings.models[provider]?.[effectiveType];
    if (configured?.trim()) return configured.trim();
  }

  if (settings.provider === provider) {
    if (effectiveType === 'reasoning' && settings.reasoningModel?.trim()) {
      return settings.reasoningModel.trim();
    }
    if (effectiveType === 'fast' && settings.fastModel?.trim()) {
      return settings.fastModel.trim();
    }
  }

  // Modern official defaults
  if (provider === 'gemini') {
    return effectiveType === 'reasoning' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  } else if (provider === 'openai') {
    return effectiveType === 'reasoning' ? 'gpt-4o' : 'gpt-4o-mini';
  } else {
    return effectiveType === 'reasoning' ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-haiku-20241022';
  }
}

export async function callLLM(options: LLMRequestOptions): Promise<string> {
  const { systemPrompt, userPrompt, settings, modelType = 'fast', responseFormat = 'json' } = options;

  const initialProvider = settings.provider || 'gemini';
  const effectiveModelType = settings.useOnlyFastModels ? 'fast' : modelType;

  // Build the fallback attempts chain
  const attempts: ProviderAttempt[] = [];
  const providersPriority: AIProvider[] = [
    initialProvider,
    ...((['gemini', 'openai', 'anthropic'] as AIProvider[]).filter(p => p !== initialProvider))
  ];

  for (const prov of providersPriority) {
    const key = getApiKeyForProvider(settings, prov);
    if (!key) continue;

    const primaryProvModel = getModelForProvider(settings, prov, effectiveModelType);
    const isFirstProv = prov === initialProvider;

    // 1. Target model for this provider
    attempts.push({
      provider: prov,
      model: primaryProvModel,
      apiKey: key,
      isFallback: !isFirstProv,
      label: `${prov.toUpperCase()} (${primaryProvModel})`,
    });

    // 2. If target model was reasoning and user allows fast fallback on same platform
    if (effectiveModelType === 'reasoning' && !settings.useOnlyFastModels) {
      const fastProvModel = getModelForProvider(settings, prov, 'fast');
      if (fastProvModel !== primaryProvModel) {
        attempts.push({
          provider: prov,
          model: fastProvModel,
          apiKey: key,
          isFallback: true,
          label: `${prov.toUpperCase()} [Rápido / Fast] (${fastProvModel})`,
        });
      }
    }
  }

  // If no API key was found for any provider, explain clearly as requested
  if (attempts.length === 0) {
    throw new Error(
      'Para usar las herramientas de inteligencia artificial es necesario disponer de un modelo de IA y configurar una API Key en la sección de Configuración.'
    );
  }

  const primaryAttempt = attempts[0];
  let lastError: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      let result = '';
      if (attempt.provider === 'gemini') {
        result = await callGemini(attempt.apiKey, attempt.model, systemPrompt, userPrompt, responseFormat);
      } else if (attempt.provider === 'openai') {
        result = await callOpenAI(attempt.apiKey, attempt.model, systemPrompt, userPrompt, responseFormat);
      } else if (attempt.provider === 'anthropic') {
        result = await callAnthropic(attempt.apiKey, attempt.model, systemPrompt, userPrompt);
      }

      // If we are beyond the first attempt, a fallback occurred successfully!
      if (i > 0) {
        notifyFallbackTriggered({
          originalProvider: primaryAttempt.provider,
          originalModel: primaryAttempt.model,
          fallbackProvider: attempt.provider,
          fallbackModel: attempt.model,
          reason: lastError?.message || 'El modelo principal no estuvo disponible o denegó la solicitud.',
        });
      }

      return result;
    } catch (err: any) {
      console.warn(`Intento fallido con ${attempt.label}:`, err);
      lastError = err;
    }
  }

  throw new Error(
    `Todos los intentos de IA han fallado. Último error reportado: ${lastError?.message || lastError || 'Error desconocido'}`
  );
}

function notifyFallbackTriggered(detail: AIFallbackEventDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wf_ai_fallback_triggered', {
        detail,
      })
    );
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  responseFormat: 'json' | 'text'
): Promise<string> {
  // Normalize model and use official v1beta endpoint
  const normalizedModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  if (responseFormat === 'json') {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  responseFormat: 'json' | 'text'
): Promise<string> {
  const normalizedModel = model || 'gpt-4o-mini';
  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const body: any = {
    model: normalizedModel,
    messages,
    temperature: 0.2,
  };

  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string
): Promise<string> {
  const normalizedModel = model || 'claude-3-5-haiku-20241022';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: normalizedModel,
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return text.trim();
}
