import React from 'react';
import { Award, RotateCcw, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';

interface SessionSummaryProps {
  score: {
    correct: number;
    total: number;
  };
  onRestart: () => void;
  onNewSession: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ score, onRestart, onNewSession }) => {
  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white mx-auto flex items-center justify-center">
        <Award className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-zinc-900">Sessão Concluída!</h2>
        <p className="text-xs text-zinc-500">
          Você praticou a recuperação ativa com base estrita no material fornecido.
        </p>
      </div>

      {score.total > 0 && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <div>
            <div className="text-xs text-zinc-500 font-medium">Acertos</div>
            <div className="text-lg font-bold text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{score.correct}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-medium">Erros</div>
            <div className="text-lg font-bold text-red-500 flex items-center justify-center gap-1 mt-0.5">
              <XCircle className="w-4 h-4" />
              <span>{score.total - score.correct}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-medium">Aproveitamento</div>
            <div className="text-lg font-bold text-zinc-900 mt-0.5">{percentage}%</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          id="summary-restart-session-btn"
          onClick={onRestart}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refazer Atividades</span>
        </button>
        <button
          type="button"
          id="summary-new-session-btn"
          onClick={onNewSession}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nova Sessão / Outro Material</span>
        </button>
      </div>
    </div>
  );
};
