/**
 * Cliente HTTP defensivo para chamadas de API.
 * Valida status HTTP, Content-Type e registra diagnósticos detalhados para o usuário e console.
 */

export interface ApiDiagnostics {
  requestTime: string;
  origin: string;
  targetUrl: string;
  fullUrl: string;
  method: string;
  status?: number;
  statusText?: string;
  responseUrl?: string;
  contentType?: string;
  bodyPreview?: string;
  isJson: boolean;
  success: boolean;
  error?: string;
  data?: any;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  onDiagnostics?: (diag: ApiDiagnostics) => void
): Promise<T> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const method = options?.method || 'GET';
  const fullUrl = url.startsWith('http') ? url : `${origin}${url}`;

  // Log pré-requisição conforme especificação
  console.log('[API Request Outbound]:', {
    origin,
    url,
    fullUrl,
    method,
    timestamp: new Date().toISOString(),
  });

  const diagnostics: ApiDiagnostics = {
    requestTime: new Date().toISOString(),
    origin,
    targetUrl: url,
    fullUrl,
    method,
    isJson: false,
    success: false,
  };

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    diagnostics.error = netErr?.message || 'Falha de rede/conexão';
    console.error(`[API Network Error] Falha de conexão ao chamar ${url}:`, netErr);
    if (onDiagnostics) onDiagnostics(diagnostics);
    throw new Error(`Não foi possível conectar ao servidor (${url}). Verifique a conexão com o ambiente.`);
  }

  const contentType = response.headers.get('content-type') || '';
  diagnostics.status = response.status;
  diagnostics.statusText = response.statusText;
  diagnostics.responseUrl = response.url;
  diagnostics.contentType = contentType;

  // Verificação defensiva: o Content-Type retornado é JSON?
  if (!contentType.includes('application/json')) {
    const rawBody = await response.text();
    diagnostics.bodyPreview = rawBody.slice(0, 300);
    diagnostics.error = `Formato retornado (${contentType || 'indefinido'}) não é JSON`;

    console.error('[API Diagnostic Error] Resposta recebida não é JSON:', {
      origin,
      targetUrl: url,
      responseUrl: response.url,
      method,
      status: response.status,
      statusText: response.statusText,
      contentType,
      bodyPreview: rawBody.slice(0, 300),
    });

    if (onDiagnostics) onDiagnostics(diagnostics);

    throw new Error(
      `O servidor retornou uma resposta não-JSON (Status: ${response.status}, Content-Type: ${contentType || 'desconhecido'}, URL: ${response.url}).`
    );
  }

  diagnostics.isJson = true;

  // Parse seguro de JSON
  let data: any;
  try {
    data = await response.json();
    diagnostics.data = data;
  } catch (parseErr: any) {
    diagnostics.error = parseErr?.message;
    console.error('[API JSON Parse Error] Erro ao interpretar JSON retornado:', {
      url,
      status: response.status,
      error: parseErr?.message,
    });
    if (onDiagnostics) onDiagnostics(diagnostics);
    throw new Error('A resposta do servidor continha uma estrutura JSON malformada.');
  }

  // Log pós-resposta
  console.log('[API Response Received]:', {
    responseUrl: response.url,
    status: response.status,
    contentType,
    dataSummary: typeof data === 'object' ? Object.keys(data) : 'non-object',
  });

  if (!response.ok) {
    diagnostics.error = data?.error || `Status HTTP ${response.status}`;
    console.error('[API Error Response]:', { url, status: response.status, data });
    if (onDiagnostics) onDiagnostics(diagnostics);
    throw new Error(data?.error || `Erro do servidor (${response.status}: ${response.statusText})`);
  }

  diagnostics.success = true;
  if (onDiagnostics) onDiagnostics(diagnostics);

  return data as T;
}

/**
 * Função de verificação direta para o botão de diagnóstico no frontend
 */
export async function testHealthEndpoint(): Promise<ApiDiagnostics> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = '/api/health';
  const fullUrl = `${origin}${url}`;

  const diag: ApiDiagnostics = {
    requestTime: new Date().toISOString(),
    origin,
    targetUrl: url,
    fullUrl,
    method: 'GET',
    isJson: false,
    success: false,
  };

  try {
    const res = await fetch(url);
    diag.status = res.status;
    diag.statusText = res.statusText;
    diag.responseUrl = res.url;
    diag.contentType = res.headers.get('content-type') || '';

    const text = await res.text();
    diag.bodyPreview = text.slice(0, 300);

    if (diag.contentType.includes('application/json')) {
      diag.isJson = true;
      try {
        diag.data = JSON.parse(text);
        diag.success = res.ok;
      } catch {
        diag.isJson = false;
      }
    }
  } catch (err: any) {
    diag.error = err?.message || 'Falha de conexão';
  }

  return diag;
}
