import React, { useState } from 'react';
import { MultipleChoiceQuestion } from '../types.js';
import { CheckCircle2, XCircle, HelpCircle, Bookmark, ArrowRight } from 'lucide-react';

interface MultipleChoiceCardProps {
  question: MultipleChoiceQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswered?: (isCorrect: boolean) => void;
}

export const MultipleChoiceCard: React.FC<MultipleChoiceCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswered,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSelect = (id: string) => {
    if (hasSubmitted) return;
    setSelectedOptionId(id);
    setHasSubmitted(true);
    const isCorrect = id.toUpperCase() === question.correctOptionId.toUpperCase();
    if (onAnswered) {
      onAnswered(isCorrect);
    }
  };

  const isAnswered = hasSubmitted && selectedOptionId !== null;
  const isUserCorrect = isAnswered && selectedOptionId.toUpperCase() === question.correctOptionId.toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs">
            {questionNumber}
          </span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Múltipla Escolha • Questão {questionNumber} de {totalQuestions}
          </span>
        </div>
        {isAnswered && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isUserCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isUserCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isUserCorrect ? 'Resposta Correta' : 'Resposta Incorreta'}
          </span>
        )}
      </div>

      {/* Prompt */}
      <div>
        <p className="text-sm sm:text-base font-medium text-zinc-900 leading-relaxed">{question.prompt}</p>
      </div>

      {/* Options A, B, C, D */}
      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const isThisCorrect = opt.id.toUpperCase() === question.correctOptionId.toUpperCase();

          let buttonStyle = 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-800';
          let badgeStyle = 'bg-zinc-100 text-zinc-700 border-zinc-200';

          if (isAnswered) {
            if (isThisCorrect) {
              buttonStyle = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-500 font-medium';
              badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
            } else if (isSelected && !isThisCorrect) {
              buttonStyle = 'border-red-400 bg-red-50/60 text-red-950 ring-1 ring-red-400';
              badgeStyle = 'bg-red-600 text-white border-red-600';
            } else {
              buttonStyle = 'border-zinc-100 bg-zinc-50/40 text-zinc-400 opacity-60';
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              id={`option-${question.id}-${opt.id}`}
              disabled={isAnswered}
              onClick={() => handleSelect(opt.id)}
              className={`w-full p-3 sm:p-3.5 rounded-lg border text-left transition flex items-start gap-3 ${buttonStyle}`}
            >
              <span
                className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${badgeStyle}`}
              >
                {opt.id}
              </span>
              <span className="text-xs sm:text-sm leading-relaxed">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation & Source Reference */}
      {isAnswered && (
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="bg-zinc-50 rounded-lg p-3.5 text-xs text-zinc-700 space-y-1.5 border border-zinc-200/80">
            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Explicação & Gabarito ({question.correctOptionId})</span>
            </div>
            <p className="leading-relaxed">{question.explanation}</p>
          </div>

          {question.sourceReference && (
            <div className="flex items-start gap-2 text-xs text-zinc-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60">
              <Bookmark className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-900">Fundamentação no Material: </span>
                <span className="italic">"{question.sourceReference}"</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
