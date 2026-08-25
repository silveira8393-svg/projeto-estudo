import React from 'react';
import { User, FolderPlus, ArrowRight, BookOpen } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-profile' | 'no-project';
  onAction: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  if (type === 'no-profile') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-zinc-200 shadow-xs text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 mx-auto flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-zinc-900">Nenhum Perfil Selecionado</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            O sistema inicia completamente vazio e neutro. Crie seu primeiro perfil de estudo para começar.
          </p>
        </div>
        <button
          type="button"
          id="empty-create-profile-btn"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition"
        >
          <User className="w-4 h-4" />
          <span>Criar Primeiro Perfil</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-zinc-200 shadow-xs text-center space-y-5">
      <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 mx-auto flex items-center justify-center">
        <FolderPlus className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-zinc-900">Crie seu Primeiro Projeto de Estudo</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Projetos organizam livremente seus materiais de estudo sem listas fechadas ou categorias impostas.
        </p>
      </div>
      <button
        type="button"
        id="empty-create-project-btn"
        onClick={onAction}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition"
      >
        <FolderPlus className="w-4 h-4" />
        <span>Criar Projeto de Estudo</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
