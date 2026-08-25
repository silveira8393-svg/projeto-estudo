import React from 'react';
import { User, FolderPlus, BookOpen, ChevronRight } from 'lucide-react';
import { Profile, StudyProject } from '../types.js';

interface HeaderProps {
  currentProfile: Profile | null;
  currentProject: StudyProject | null;
  profiles: Profile[];
  projects: StudyProject[];
  onSelectProfile: (profile: Profile) => void;
  onSelectProject: (project: StudyProject) => void;
  onOpenCreateProfile: () => void;
  onOpenCreateProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  currentProject,
  profiles,
  projects,
  onSelectProfile,
  onSelectProject,
  onOpenCreateProfile,
  onOpenCreateProject,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-lg">
            EA
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 tracking-tight leading-tight">
              Estudo Ativo
            </h1>
            <p className="text-xs text-zinc-500">Aprendizagem baseada em materiais</p>
          </div>
        </div>

        {/* Profile & Project Context Bar */}
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {/* Profile Dropdown / Add */}
          {profiles.length === 0 ? (
            <button
              id="header-create-profile-btn"
              onClick={onOpenCreateProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
            >
              <User className="w-3.5 h-3.5 text-zinc-600" />
              <span>Criar Perfil</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="relative inline-block">
                <select
                  id="header-profile-select"
                  value={currentProfile?.id || ''}
                  onChange={(e) => {
                    const p = profiles.find((item) => item.id === e.target.value);
                    if (p) onSelectProfile(p);
                  }}
                  aria-label="Selecionar Perfil"
                  className="bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-900 text-xs rounded-md px-2.5 py-1.5 pr-6 font-medium focus:ring-1 focus:ring-zinc-900 focus:outline-hidden"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      Perfil: {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                id="header-add-profile-icon-btn"
                onClick={onOpenCreateProfile}
                title="Novo Perfil"
                className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition"
              >
                <User className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentProfile && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />

              {/* Project Dropdown / Add */}
              {projects.length === 0 ? (
                <button
                  id="header-create-project-btn"
                  onClick={onOpenCreateProject}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Novo Projeto</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    id="header-project-select"
                    value={currentProject?.id || ''}
                    onChange={(e) => {
                      const proj = projects.find((item) => item.id === e.target.value);
                      if (proj) onSelectProject(proj);
                    }}
                    aria-label="Selecionar Projeto de Estudo"
                    className="bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-900 text-xs rounded-md px-2.5 py-1.5 pr-6 font-medium focus:ring-1 focus:ring-zinc-900 focus:outline-hidden"
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        Projeto: {proj.title}
                      </option>
                    ))}
                  </select>
                  <button
                    id="header-add-project-icon-btn"
                    onClick={onOpenCreateProject}
                    title="Novo Projeto de Estudo"
                    className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
