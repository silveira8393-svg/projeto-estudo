import React from 'react';
import { StudyMode, StudyDifficulty } from '../types.js';
import { Settings, ShieldCheck, Sparkles, Plus, Minus, BookOpen, CheckCircle } from 'lucide-react';

interface SessionConfigViewProps {
  mode: StudyMode;
  setMode: (mode: StudyMode) => void;
  difficulty: StudyDifficulty;
  setDifficulty: (diff: StudyDifficulty) => void;
  flashcardCount: number;
  setFlashcardCount: (count: number) => void;
  multipleChoiceCount: number;
  setMultipleChoiceCount: (count: number) => void;
  trueFalseCount: number;
  setTrueFalseCount: (count: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  selectedTopicsCount: number;
}

export const SessionConfigView: React.FC<SessionConfigViewProps> = ({
  mode,
  setMode,
  difficulty,
  setDifficulty,
  flashcardCount,
  setFlashcardCount,
  multipleChoiceCount,
  setMultipleChoiceCount,
  trueFalseCount,
  setTrueFalseCount,
  onGenerate,
  isGenerating,
  selectedTopicsCount,
}) => {
  const totalActivities = flashcardCount + multipleChoiceCount + trueFalseCount;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-700" />
          <h2 className="text-sm font-semibold text-zinc-900">Configuração da Sessão de Estudo</h2>
        </div>
        <span className="text-xs text-zinc-500 font-medium">
          Total de atividades: <span className="font-semibold text-zinc-900">{totalActivities}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fonte & Fidelidade */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-2">Fonte & Modo de Fidelidade</label>
          <div className="space-y-2">
            <button
              type="button"
              id="mode-faithful-btn"
              onClick={() => setMode('faithful')}
              className={`w-full p-3 rounded-lg border text-left transition flex items-start gap-3 ${
                mode === 'faithful'
                  ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-900">Fiel ao Material</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                    Padrão
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-normal">
                  Todas as perguntas, gabaritos e justificativas são estritamente sustentadas no conteúdo fornecido.
                </p>
              </div>
            </button>

            <button
              type="button"
              id="mode-complementary-btn"
              onClick={() => setMode('complementary')}
              className={`w-full p-3 rounded-lg border text-left transition flex items-start gap-3 ${
                mode === 'complementary'
                  ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-zinc-900">Modo Complementar</span>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-normal">
                  Permite à IA expandir com contextualizações adicionais, sempre sinalizando acréscimos.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Dificuldade */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-2">Nível de Dificuldade</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'auto', label: 'Automático', desc: 'Conforme material' },
              { id: 'basic', label: 'Básico', desc: 'Definições e termos' },
              { id: 'intermediate', label: 'Intermediário', desc: 'Aplicação e relações' },
              { id: 'advanced', label: 'Avançado', desc: 'Análise e casos' },
            ].map((diff) => (
              <button
                key={diff.id}
                type="button"
                id={`difficulty-${diff.id}-btn`}
                onClick={() => setDifficulty(diff.id as StudyDifficulty)}
                className={`p-2.5 rounded-lg border text-left transition ${
                  difficulty === diff.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 hover:border-zinc-300 text-zinc-800'
                }`}
              >
                <div className="text-xs font-semibold">{diff.label}</div>
                <div className={`text-[10px] ${difficulty === diff.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {diff.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quantidades por Tipo de Atividade */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-2">
          Defina as Quantidades Desejadas (Livre Escolha)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Flashcards */}
          <div className="border border-zinc-200 rounded-lg p-3.5 flex items-center justify-between bg-zinc-50/40">
            <div>
              <div className="text-xs font-semibold text-zinc-900">Flashcards</div>
              <div className="text-[11px] text-zinc-500">Fixação ativa</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="dec-flashcards-btn"
                onClick={() => setFlashcardCount(Math.max(0, flashcardCount - 1))}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={flashcardCount === 0}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-zinc-900">{flashcardCount}</span>
              <button
                type="button"
                id="inc-flashcards-btn"
                onClick={() => setFlashcardCount(flashcardCount + 1)}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Múltipla Escolha */}
          <div className="border border-zinc-200 rounded-lg p-3.5 flex items-center justify-between bg-zinc-50/40">
            <div>
              <div className="text-xs font-semibold text-zinc-900">Múltipla Escolha</div>
              <div className="text-[11px] text-zinc-500">4 alternativas</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="dec-multiple-choice-btn"
                onClick={() => setMultipleChoiceCount(Math.max(0, multipleChoiceCount - 1))}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={multipleChoiceCount === 0}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-zinc-900">{multipleChoiceCount}</span>
              <button
                type="button"
                id="inc-multiple-choice-btn"
                onClick={() => setMultipleChoiceCount(multipleChoiceCount + 1)}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Verdadeiro ou Falso */}
          <div className="border border-zinc-200 rounded-lg p-3.5 flex items-center justify-between bg-zinc-50/40">
            <div>
              <div className="text-xs font-semibold text-zinc-900">Verdadeiro ou Falso</div>
              <div className="text-[11px] text-zinc-500">Com justificativa</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="dec-true-false-btn"
                onClick={() => setTrueFalseCount(Math.max(0, trueFalseCount - 1))}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                disabled={trueFalseCount === 0}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-zinc-900">{trueFalseCount}</span>
              <button
                type="button"
                id="inc-true-false-btn"
                onClick={() => setTrueFalseCount(trueFalseCount + 1)}
                className="w-7 h-7 rounded border border-zinc-300 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          id="generate-activities-btn"
          onClick={onGenerate}
          disabled={isGenerating || totalActivities === 0 || selectedTopicsCount === 0}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition shadow-sm"
        >
          <BookOpen className="w-4 h-4" />
          <span>{isGenerating ? 'Gerando Atividades com IA...' : 'Iniciar Estudo com Material'}</span>
        </button>
      </div>
    </div>
  );
};
