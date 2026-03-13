import logger from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface APIError {
  message: string;
  type?: string;
  code?: string;
}

export interface APIErrorResponse {
  error?: APIError;
}

export function buildApiUrl(baseUrl: string): string {
  let url = baseUrl.trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (!url.endsWith('/v1')) {
    url = url + '/v1';
  }
  return url + '/chat/completions';
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return 'empty';
  }
  return `${apiKey.substring(0, 8)}...`;
}

export async function chatCompletion(
  apiUrl: string,
  apiKey: string,
  request: ChatCompletionRequest
): Promise<{
  success: boolean;
  data?: ChatCompletionResponse;
  error?: string;
  elapsed: number;
}> {
  const startTime = Date.now();
  const fullUrl = buildApiUrl(apiUrl);

  await logger.info('OpenAIAPI', '发送请求', {
    url: fullUrl,
    model: request.model,
    apiKeyPrefix: maskApiKey(apiKey),
  });

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const elapsed = Date.now() - startTime;
    const responseStatus = `${response.status} ${response.statusText}`;

    await logger.info('OpenAIAPI', '收到响应', {
      status: responseStatus,
      elapsed: `${elapsed}ms`,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorData: APIErrorResponse = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || errorData.error?.type || `HTTP ${response.status}`;

      await logger.error('OpenAIAPI', '请求失败', {
        status: responseStatus,
        errorType: errorData.error?.type,
        errorMessage: errorMsg,
        errorCode: errorData.error?.code,
      });

      return {
        success: false,
        error: errorMsg,
        elapsed,
      };
    }

    const data: ChatCompletionResponse = await response.json();

    await logger.info('OpenAIAPI', '请求成功', {
      responseId: data.id,
      model: data.model,
      usage: data.usage,
    });

    return {
      success: true,
      data,
      elapsed,
    };
  } catch (e) {
    const elapsed = Date.now() - startTime;
    const errorMsg = e instanceof Error ? e.message : '网络连接失败';

    await logger.error('OpenAIAPI', '请求异常', {
      error: errorMsg,
      elapsed: `${elapsed}ms`,
      stack: e instanceof Error ? e.stack : undefined,
    });

    return {
      success: false,
      error: errorMsg,
      elapsed,
    };
  }
}
