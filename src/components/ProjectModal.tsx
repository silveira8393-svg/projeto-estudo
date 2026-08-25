import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  profileName: string;
  onClose: () => void;
  onSave: (title: string, description?: string, goal?: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  profileName,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim(), description.trim() || undefined, goal.trim() || undefined);
      setTitle('');
      setDescription('');
      setGoal('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-zinc-700" />
            <h2 className="text-base font-semibold text-zinc-900">Novo Projeto de Estudo</h2>
          </div>
          <button
            id="close-project-modal-btn"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-md border border-zinc-100">
            Vinculado ao perfil ativo: <span className="font-semibold text-zinc-800">{profileName}</span>
          </div>

          <div>
            <label htmlFor="project-title-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Nome do Projeto <span className="text-red-500">*</span>
            </label>
            <input
              id="project-title-input"
              type="text"
              required
              autoFocus
              placeholder="Ex: Direito Constitucional, Biologia Celular, Estatística..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="project-desc-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Descrição (Opcional)
            </label>
            <input
              id="project-desc-input"
              type="text"
              placeholder="Ex: Revisão dos capítulos 1 a 4 para prova mensal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="project-goal-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Objetivo de Estudo (Opcional)
            </label>
            <input
              id="project-goal-input"
              type="text"
              placeholder="Ex: Fixar definições fundamentais e dominar exceções"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              id="cancel-project-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="save-project-btn"
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
