import React, { useState } from 'react';
import { X, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-700" />
            <h2 className="text-base font-semibold text-zinc-900">Novo Perfil de Estudo</h2>
          </div>
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="profile-name-input" className="block text-xs font-medium text-zinc-700 mb-1">
              Nome ou Identificação do Perfil <span className="text-red-500">*</span>
            </label>
            <input
              id="profile-name-input"
              type="text"
              required
              autoFocus
              placeholder="Ex: João, Maria, Concursos, Pessoal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-hidden"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Cada perfil mantém seus próprios projetos, materiais e histórico isolados.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              id="cancel-profile-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="save-profile-btn"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition"
            >
              Salvar Perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
