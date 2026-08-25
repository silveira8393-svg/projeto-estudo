import React, { useState } from 'react';
import { Flashcard } from '../types.js';
import { RotateCw, ChevronLeft, ChevronRight, Lightbulb, Bookmark, CheckCircle2 } from 'lucide-react';

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onFinish?: () => void;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ flashcards, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [markedAsLearned, setMarkedAsLearned] = useState<string[]>([]);

  if (!flashcards || flashcards.length === 0) return null;

  const current = flashcards[currentIndex];
  const isLearned = markedAsLearned.includes(current.id);

  const handleNext = () => {
    setIsFlipped(false);
    setShowTip(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onFinish) {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setShowTip(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const toggleLearned = () => {
    if (isLearned) {
      setMarkedAsLearned(markedAsLearned.filter((id) => id !== current.id));
    } else {
      setMarkedAsLearned([...markedAsLearned, current.id]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
        <span>
          Flashcard <span className="font-semibold text-zinc-900">{currentIndex + 1}</span> de {flashcards.length}
        </span>
        <button
          type="button"
          id="toggle-learned-card-btn"
          onClick={toggleLearned}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition text-xs ${
            isLearned
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isLearned ? 'Fixado' : 'Marcar como Fixado'}</span>
        </button>
      </div>

      {/* 3D Flip Card Container */}
      <div
        id="flashcard-interactive-box"
        onClick={() => setIsFlipped(!isFlipped)}
        className="min-h-[260px] bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 cursor-pointer flex flex-col justify-between hover:border-zinc-300 transition select-none relative group"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
            {isFlipped ? 'Verso • Resposta' : 'Frente • Estímulo'}
          </span>
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <RotateCw className="w-3 h-3 group-hover:rotate-180 transition duration-300" />
            Clique para virar
          </span>
        </div>

        <div className="py-4 my-auto text-center">
          <p className="text-base sm:text-lg font-medium text-zinc-900 leading-relaxed">
            {isFlipped ? current.back : current.front}
          </p>
        </div>

        {/* Source Reference Badge when flipped */}
        {isFlipped && current.sourceReference && (
          <div className="pt-3 border-t border-zinc-100 flex items-start gap-2 text-left bg-zinc-50/80 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <Bookmark className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-600">
              <span className="font-semibold text-zinc-800">Base no Material: </span>
              {current.sourceReference}
            </div>
          </div>
        )}
      </div>

      {/* Tip Drawer */}
      {current.tip && (
        <div className="text-xs">
          <button
            type="button"
            id="toggle-tip-btn"
            onClick={() => setShowTip(!showTip)}
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 transition"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{showTip ? 'Ocultar Dica' : 'Ver Dica de Memorização'}</span>
          </button>
          {showTip && (
            <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/80 text-amber-900 rounded-lg">
              {current.tip}
            </div>
          )}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          id="prev-flashcard-btn"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <span className="text-xs text-zinc-400">Dica: Use espaço ou clique no card para virar</span>

        <button
          type="button"
          id="next-flashcard-btn"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition"
        >
          <span>{currentIndex === flashcards.length - 1 ? 'Concluir' : 'Próximo'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
