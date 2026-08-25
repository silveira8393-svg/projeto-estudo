import React from 'react';
import { MaterialTopic } from '../types.js';
import { CheckSquare, Square, Tag, Layers, FileText } from 'lucide-react';

interface TopicStructureViewProps {
  materialTitle: string;
  topics: MaterialTopic[];
  selectedTopicIds: string[];
  onToggleTopic: (topicId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const TopicStructureView: React.FC<TopicStructureViewProps> = ({
  materialTitle,
  topics,
  selectedTopicIds,
  onToggleTopic,
  onSelectAll,
  onClearAll,
}) => {
  const allSelected = topics.length > 0 && selectedTopicIds.length === topics.length;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-semibold text-zinc-900">Estrutura e Tópicos Identificados</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Material: <span className="font-medium text-zinc-800">{materialTitle}</span> • Selecione os tópicos para gerar as atividades
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="select-all-topics-btn"
            onClick={allSelected ? onClearAll : onSelectAll}
            className="px-2.5 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 font-medium text-zinc-700 transition"
          >
            {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <span className="text-zinc-500">
            {selectedTopicIds.length}/{topics.length} selecionados
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 divide-y divide-zinc-100">
        {topics.map((topic) => {
          const isSelected = selectedTopicIds.includes(topic.id);
          return (
            <div
              key={topic.id}
              onClick={() => onToggleTopic(topic.id)}
              className={`py-3.5 px-3 rounded-lg transition cursor-pointer flex items-start gap-3 ${
                isSelected ? 'bg-zinc-50/80 border border-zinc-200' : 'hover:bg-zinc-50/40 border border-transparent'
              }`}
            >
              <div className="pt-0.5 text-zinc-700">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-zinc-900" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{topic.title}</span>
                  </h3>
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-zinc-200/60 text-zinc-700 px-1.5 py-0.5 rounded">
                    {topic.sectionType}
                  </span>
                </div>

                {topic.summary && <p className="text-xs text-zinc-600 leading-relaxed">{topic.summary}</p>}

                {topic.keyConcepts && topic.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Tag className="w-3 h-3 text-zinc-400" />
                    {topic.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-white border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
