import React, { useState } from 'react';
import { TrueFalseQuestion } from '../types.js';
import { CheckCircle2, XCircle, HelpCircle, Bookmark, Check, X } from 'lucide-react';

interface TrueFalseCardProps {
  question: TrueFalseQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswered?: (isCorrect: boolean) => void;
}

export const TrueFalseCard: React.FC<TrueFalseCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswered,
}) => {
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSelect = (choice: boolean) => {
    if (hasSubmitted) return;
    setUserChoice(choice);
    setHasSubmitted(true);
    const isCorrect = choice === question.isTrue;
    if (onAnswered) {
      onAnswered(isCorrect);
    }
  };

  const isAnswered = hasSubmitted && userChoice !== null;
  const isUserCorrect = isAnswered && userChoice === question.isTrue;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs">
            {questionNumber}
          </span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Verdadeiro ou Falso • Questão {questionNumber} de {totalQuestions}
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

      {/* Statement */}
      <div className="bg-zinc-50/70 p-4 rounded-lg border border-zinc-200/60">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Afirmativa para Julgamento:</p>
        <p className="text-sm sm:text-base font-medium text-zinc-900 leading-relaxed italic">
          "{question.statement}"
        </p>
      </div>

      {/* Buttons: Verdadeiro / Falso */}
      <div className="grid grid-cols-2 gap-3">
        {/* Verdadeiro */}
        <button
          type="button"
          id={`tf-true-${question.id}`}
          disabled={isAnswered}
          onClick={() => handleSelect(true)}
          className={`p-3.5 rounded-lg border text-center font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            !isAnswered
              ? 'border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800'
              : question.isTrue
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
              : userChoice === true
              ? 'border-red-400 bg-red-50 text-red-900 ring-1 ring-red-400'
              : 'border-zinc-200 bg-zinc-50 text-zinc-400 opacity-50'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Verdadeiro</span>
        </button>

        {/* Falso */}
        <button
          type="button"
          id={`tf-false-${question.id}`}
          disabled={isAnswered}
          onClick={() => handleSelect(false)}
          className={`p-3.5 rounded-lg border text-center font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
            !isAnswered
              ? 'border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800'
              : !question.isTrue
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
              : userChoice === false
              ? 'border-red-400 bg-red-50 text-red-900 ring-1 ring-red-400'
              : 'border-zinc-200 bg-zinc-50 text-zinc-400 opacity-50'
          }`}
        >
          <X className="w-4 h-4" />
          <span>Falso</span>
        </button>
      </div>

      {/* Justification & Source Reference */}
      {isAnswered && (
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="bg-zinc-50 rounded-lg p-3.5 text-xs text-zinc-700 space-y-1.5 border border-zinc-200/80">
            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Gabarito Oficial: {question.isTrue ? 'VERDADEIRO' : 'FALSO'}</span>
            </div>
            <p className="leading-relaxed">{question.justification}</p>
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
