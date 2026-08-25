import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Type, Sparkles, AlertCircle, CheckCircle2, Loader2, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { safeFetchJson, testHealthEndpoint, ApiDiagnostics } from '../lib/api.js';

interface MaterialInputProps {
  onProcessed: (data: { title: string; rawText: string; wordCount: number; fileType: string }) => void;
  isLoading: boolean;
}

export const MaterialInput: React.FC<MaterialInputProps> = ({ onProcessed, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [materialTitle, setMaterialTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastDiagnostics, setLastDiagnostics] = useState<ApiDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRunHealthCheck = async () => {
    setIsTestingHealth(true);
    try {
      const diag = await testHealthEndpoint();
      setLastDiagnostics(diag);
      setShowDiagnostics(true);
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      if (!materialTitle) {
        setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      if (!materialTitle) {
        setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === 'upload' && !selectedFile) {
      setErrorMsg('Por favor selecione um arquivo (PDF, DOCX ou TXT).');
      return;
    }

    if (activeTab === 'paste' && (!pastedText || pastedText.trim().length < 30)) {
      setErrorMsg('Por favor insira um texto com pelo menos 30 caracteres.');
      return;
    }

    setIsExtracting(true);
    try {
      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', materialTitle || selectedFile.name);

        const data = await safeFetchJson<{
          success: boolean;
          title: string;
          text: string;
          wordCount: number;
          fileType: string;
          error?: string;
        }>('/api/materials/extract', {
          method: 'POST',
          body: formData,
        }, (diag) => setLastDiagnostics(diag));

        if (!data.success) {
          throw new Error(data.error || 'Falha ao extrair texto do documento.');
        }

        onProcessed({
          title: data.title,
          rawText: data.text,
          wordCount: data.wordCount,
          fileType: data.fileType,
        });
      } else {
        const data = await safeFetchJson<{
          success: boolean;
          title: string;
          text: string;
          wordCount: number;
          fileType: string;
          error?: string;
        }>('/api/materials/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textInput: pastedText,
            title: materialTitle || 'Texto Fornecido',
          }),
        }, (diag) => setLastDiagnostics(diag));

        if (!data.success) {
          throw new Error(data.error || 'Falha ao processar texto.');
        }

        onProcessed({
          title: data.title,
          rawText: data.text,
          wordCount: data.wordCount,
          fileType: 'text_paste',
        });
      }
    } catch (err: any) {
      console.error('[MaterialInput Extraction Catch]:', err);
      setErrorMsg(err?.message || 'Erro ao processar o material. Tente novamente.');
      setShowDiagnostics(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const wordCount = pastedText ? pastedText.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Header Tabs & Quick Diagnostic Tool */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-200 bg-zinc-50/50">
        <div className="flex flex-1">
          <button
            type="button"
            id="tab-upload-file-btn"
            onClick={() => {
              setActiveTab('upload');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-medium inline-flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-zinc-900 text-zinc-900 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload de Arquivo (PDF, DOCX, TXT)</span>
          </button>
          <button
            type="button"
            id="tab-paste-text-btn"
            onClick={() => {
              setActiveTab('paste');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-medium inline-flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-zinc-900 text-zinc-900 bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Digitar ou Colar Texto</span>
          </button>
        </div>

        {/* Live Health Check Diagnostic Button */}
        <div className="px-3 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l border-zinc-200 flex items-center justify-end">
          <button
            type="button"
            id="test-api-health-btn"
            onClick={handleRunHealthCheck}
            disabled={isTestingHealth}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition"
            title="Verifica se o backend Express /api/health está respondendo com JSON no navegador"
          >
            <Activity className={`w-3.5 h-3.5 ${isTestingHealth ? 'animate-pulse text-emerald-600' : 'text-zinc-400'}`} />
            <span>{isTestingHealth ? 'Testando...' : 'Diagnóstico /api/health'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Panel (if triggered or on error) */}
      {showDiagnostics && lastDiagnostics && (
        <div className="p-4 bg-zinc-900 text-zinc-100 text-xs border-b border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5 text-zinc-200">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Diagnóstico do Ambiente Preview / API
            </span>
            <button
              type="button"
              onClick={() => setShowDiagnostics(false)}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300 font-mono text-[11px] bg-zinc-950 p-2.5 rounded-md border border-zinc-800">
            <div>
              <span className="text-zinc-500">Origem Frontend:</span> {lastDiagnostics.origin || '(mesma origem)'}
            </div>
            <div>
              <span className="text-zinc-500">Método / Rota:</span> {lastDiagnostics.method} {lastDiagnostics.targetUrl}
            </div>
            <div>
              <span className="text-zinc-500">Status HTTP:</span>{' '}
              <span className={lastDiagnostics.status === 200 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {lastDiagnostics.status || 'N/A'} {lastDiagnostics.statusText || ''}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Content-Type:</span>{' '}
              <span className={lastDiagnostics.isJson ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>
                {lastDiagnostics.contentType || 'indefinido'}
              </span>
            </div>
            <div className="col-span-1 sm:col-span-2 break-all">
              <span className="text-zinc-500">URL Efetiva:</span> {lastDiagnostics.responseUrl || lastDiagnostics.fullUrl}
            </div>
            {lastDiagnostics.data && (
              <div className="col-span-1 sm:col-span-2 break-all text-emerald-300">
                <span className="text-zinc-500">Resposta JSON:</span> {JSON.stringify(lastDiagnostics.data)}
              </div>
            )}
            {lastDiagnostics.bodyPreview && !lastDiagnostics.isJson && (
              <div className="col-span-1 sm:col-span-2 break-all text-amber-300">
                <span className="text-zinc-500">Início do Corpo:</span> {lastDiagnostics.bodyPreview}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {/* Material Title */}
        <div>
          <label htmlFor="material-title-input" className="block text-xs font-semibold text-zinc-700 mb-1">
            Título do Material (Opcional)
          </label>
          <input
            id="material-title-input"
            type="text"
            placeholder="Ex: Capítulo 3 - Princípios Fundamentais, Artigo 5º..."
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
          />
        </div>

        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Arquivo do Material</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Clique ou arraste para trocar
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      Arraste e solte o arquivo aqui ou <span className="text-zinc-900 underline font-semibold">procure no dispositivo</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">Suporta PDF, DOCX e TXT (máximo 30MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Paste */}
        {activeTab === 'paste' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="material-text-input" className="block text-xs font-semibold text-zinc-700">
                Conteúdo do Material
              </label>
              <span className="text-xs text-zinc-400">{wordCount} palavras</span>
            </div>
            <textarea
              id="material-text-input"
              rows={8}
              placeholder="Cole aqui notas de aula, resumos, trechos de livros, leis, apostilas ou artigos..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded-lg p-3 font-mono text-zinc-800 leading-relaxed focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
            />
          </div>
        )}

        {errorMsg && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
              {lastDiagnostics && (
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="underline font-semibold ml-2 inline-flex items-center gap-1"
                >
                  {showDiagnostics ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
                  {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-500">
            {selectedFile ? `Arquivo selecionado: ${selectedFile.name}` : ''}
          </div>
          <button
            type="submit"
            id="extract-material-submit-btn"
            disabled={isExtracting || isLoading || (activeTab === 'upload' && !selectedFile) || (activeTab === 'paste' && !pastedText.trim())}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition shadow-xs"
          >
            {isExtracting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Material...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extrair & Identificar Tópicos</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
