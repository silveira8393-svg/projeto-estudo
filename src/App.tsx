import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { ProfileModal } from './components/ProfileModal.js';
import { ProjectModal } from './components/ProjectModal.js';
import { MaterialInput, ProcessingProgressUpdate } from './components/MaterialInput.js';
import { TopicStructureView } from './components/TopicStructureView.js';
import { SessionConfigView } from './components/SessionConfigView.js';
import { FlashcardViewer } from './components/FlashcardViewer.js';
import { MultipleChoiceCard } from './components/MultipleChoiceCard.js';
import { TrueFalseCard } from './components/TrueFalseCard.js';
import { SessionSummary } from './components/SessionSummary.js';
import { EmptyState } from './components/EmptyState.js';
import {
  Profile,
  StudyProject,
  ProcessedMaterial,
  MaterialTopic,
  StudyMode,
  StudyDifficulty,
  ActivityGenerationResult,
} from './types.js';
import { safeFetchJson } from './lib/api.js';
import { BookOpen, HelpCircle, Layers, ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';

export default function App() {
  // Profiles & Projects state (Neutral - start empty)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<StudyProject[]>([]);
  const [currentProject, setCurrentProject] = useState<StudyProject | null>(null);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Active Material & Topics State
  const [currentMaterial, setCurrentMaterial] = useState<ProcessedMaterial | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isStructuring, setIsStructuring] = useState(false);

  // Session Config State
  const [mode, setMode] = useState<StudyMode>('faithful');
  const [difficulty, setDifficulty] = useState<StudyDifficulty>('auto');
  const [flashcardCount, setFlashcardCount] = useState<number>(3);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState<number>(2);
  const [trueFalseCount, setTrueFalseCount] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<ProcessingProgressUpdate | null>(null);

  // Active Session & Generated Activities
  const [activityResult, setActivityResult] = useState<ActivityGenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'flashcards' | 'questions'>('flashcards');
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Profile Handlers
  const handleSaveProfile = (name: string) => {
    const newProfile: Profile = {
      id: `prof-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfile(newProfile);
    // If no projects exist for this profile, automatically open project modal
    setIsProjectModalOpen(true);
  };

  // Project Handlers
  const handleSaveProject = (title: string, description?: string, goal?: string) => {
    if (!currentProfile) return;
    const newProject: StudyProject = {
      id: `proj-${Date.now()}`,
      profileId: currentProfile.id,
      title,
      description,
      goal,
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setCurrentProject(newProject);
  };

  const currentProfileProjects = projects.filter((p) => p.profileId === currentProfile?.id);

  // Material Extraction Handler
  const handleMaterialExtracted = async (data: {
    title: string;
    rawText: string;
    wordCount: number;
    fileType: string;
  }, onProgress: (update: ProcessingProgressUpdate) => void) => {
    setIsStructuring(true);
    setGenerationError(null);
    let gradualTimer: ReturnType<typeof setInterval> | undefined;
    let structureProgress = 55;
    try {
      onProgress({ progress: structureProgress, label: 'Estruturando tópicos com IA...' });
      gradualTimer = setInterval(() => {
        structureProgress = Math.min(structureProgress + 1, 84);
        onProgress({ progress: structureProgress, label: 'Estruturando tópicos com IA...' });
      }, 1000);
      const json = await safeFetchJson<{
        success: boolean;
        title: string;
        topics: MaterialTopic[];
        error?: string;
      }>('/api/ai/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialTitle: data.title,
          rawText: data.rawText,
        }),
      });

      if (!json.success) {
        throw new Error(json.error || 'Falha ao estruturar tópicos com IA.');
      }

      if (gradualTimer) clearInterval(gradualTimer);
      onProgress({ progress: 90, label: 'Validando e organizando tópicos...' });

      const processed: ProcessedMaterial = {
        id: `mat-${Date.now()}`,
        projectId: currentProject?.id || 'default',
        title: json.title || data.title,
        fileType: data.fileType as any,
        rawText: data.rawText,
        topics: json.topics || [],
        extractedAt: new Date().toISOString(),
      };

      onProgress({ progress: 100, label: 'Material concluído.' });
      await new Promise((resolve) => setTimeout(resolve, 350));
      setCurrentMaterial(processed);
      // Select all topics by default
      setSelectedTopicIds(processed.topics.map((t) => t.id));
      setActivityResult(null);
      setIsSessionFinished(false);
    } catch (err: any) {
      console.error(err);
      setGenerationError(err?.message || 'Erro ao analisar a estrutura do material.');
      throw err;
    } finally {
      if (gradualTimer) clearInterval(gradualTimer);
      setIsStructuring(false);
    }
  };

  // Topic Selection
  const handleToggleTopic = (topicId: string) => {
    if (selectedTopicIds.includes(topicId)) {
      setSelectedTopicIds(selectedTopicIds.filter((id) => id !== topicId));
    } else {
      setSelectedTopicIds([...selectedTopicIds, topicId]);
    }
  };

  const handleSelectAllTopics = () => {
    if (currentMaterial) {
      setSelectedTopicIds(currentMaterial.topics.map((t) => t.id));
    }
  };

  const handleClearAllTopics = () => {
    setSelectedTopicIds([]);
  };

  // Generation Handler
  const handleGenerateActivities = async () => {
    if (!currentMaterial || selectedTopicIds.length === 0) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress({ progress: 10, label: 'Preparando configuração...' });
    let gradualTimer: ReturnType<typeof setInterval> | undefined;

    try {
      const selectedTopics = currentMaterial.topics.filter((t) => selectedTopicIds.includes(t.id));

      // Combine excerpts or raw text from the selected topics
      let combinedContent = selectedTopics
        .map((t) => `### ${t.title}\n${t.excerptContent || t.summary}`)
        .join('\n\n');

      if (!combinedContent.trim() || combinedContent.length < 50) {
        combinedContent = currentMaterial.rawText;
      }

      setGenerationProgress({ progress: 45, label: 'Preparando conteúdo selecionado...' });
      await new Promise((resolve) => setTimeout(resolve, 200));
      setGenerationProgress({ progress: 55, label: 'Gerando atividades com IA...' });
      gradualTimer = setInterval(() => {
        setGenerationProgress((current) => current ? { ...current, progress: Math.min(current.progress + 1, 84) } : current);
      }, 1000);

      const data = await safeFetchJson<ActivityGenerationResult & { success: boolean; error?: string }>('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialTitle: currentMaterial.title,
          combinedContent,
          selectedTopics: selectedTopics.map((t) => ({ title: t.title, summary: t.summary })),
          mode,
          difficulty,
          flashcardCount,
          multipleChoiceCount,
          trueFalseCount,
        }),
      });

      if (!data.success) {
        throw new Error(data.error || 'Falha ao gerar atividades com a IA.');
      }

      if (gradualTimer) clearInterval(gradualTimer);
      setGenerationProgress({ progress: 90, label: 'Validando e organizando atividades...' });

      // Default active tab to flashcards if available, otherwise questions
      if ((data.flashcards || []).length > 0) {
        setActiveTab('flashcards');
      } else {
        setActiveTab('questions');
      }

      setScore({ correct: 0, total: 0 });
      setIsSessionFinished(false);
      setGenerationProgress({ progress: 100, label: 'Atividades concluídas.' });
      await new Promise((resolve) => setTimeout(resolve, 350));
      setActivityResult({
        flashcards: data.flashcards || [],
        multipleChoiceQuestions: data.multipleChoiceQuestions || [],
        trueFalseQuestions: data.trueFalseQuestions || [],
        warnings: data.warnings,
      });
    } catch (err: any) {
      console.error(err);
      setGenerationError(err?.message || 'Erro ao gerar atividades. Verifique o conteúdo e tente novamente.');
      setGenerationProgress(null);
    } finally {
      if (gradualTimer) clearInterval(gradualTimer);
      setIsGenerating(false);
    }
  };

  // Answer tracking
  const handleQuestionAnswered = (isCorrect: boolean) => {
    setScore((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  };

  // Reset to create another session with same or new material
  const handleNewSession = () => {
    setActivityResult(null);
    setIsSessionFinished(false);
    setScore({ correct: 0, total: 0 });
  };

  const handleResetMaterial = () => {
    setCurrentMaterial(null);
    setActivityResult(null);
    setIsSessionFinished(false);
    setSelectedTopicIds([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 text-zinc-900 flex flex-col font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Global Header */}
      <Header
        currentProfile={currentProfile}
        currentProject={currentProject}
        profiles={profiles}
        projects={currentProfileProjects}
        onSelectProfile={(p) => {
          setCurrentProfile(p);
          const userProjects = projects.filter((item) => item.profileId === p.id);
          setCurrentProject(userProjects[0] || null);
          handleResetMaterial();
        }}
        onSelectProject={(proj) => {
          setCurrentProject(proj);
          handleResetMaterial();
        }}
        onOpenCreateProfile={() => setIsProfileModalOpen(true)}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Step 0: Empty States */}
        {!currentProfile ? (
          <EmptyState type="no-profile" onAction={() => setIsProfileModalOpen(true)} />
        ) : !currentProject ? (
          <EmptyState type="no-project" onAction={() => setIsProjectModalOpen(true)} />
        ) : (
          <>
            {/* Step 1: Material Input / Reset View */}
            {!currentMaterial ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-200 pb-3">
                  <h2 className="text-base font-semibold text-zinc-900">Fornecer Material de Estudo</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Envie um arquivo PDF, DOCX, TXT ou digite/cole seu texto de estudo para extração e aprendizagem ativa.
                  </p>
                </div>
                <MaterialInput onProcessed={handleMaterialExtracted} isLoading={isStructuring} />
              </div>
            ) : (
              /* Step 2 & 3: Structured Material, Session Config, and Generated Study Activities */
              <div className="space-y-6">
                {/* Active Material Header Bar */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-zinc-900">{currentMaterial.title}</h2>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                          {currentMaterial.fileType}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {currentMaterial.topics.length} tópicos identificados • {currentMaterial.rawText.split(/\s+/).length} palavras
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="change-material-btn"
                    onClick={handleResetMaterial}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Trocar Material</span>
                  </button>
                </div>

                {generationError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* If activities have NOT been generated yet: Show Topic Tree and Session Config */}
                {!activityResult ? (
                  <div className="space-y-6">
                    <TopicStructureView
                      materialTitle={currentMaterial.title}
                      topics={currentMaterial.topics}
                      selectedTopicIds={selectedTopicIds}
                      onToggleTopic={handleToggleTopic}
                      onSelectAll={handleSelectAllTopics}
                      onClearAll={handleClearAllTopics}
                    />

                    <SessionConfigView
                      mode={mode}
                      setMode={setMode}
                      difficulty={difficulty}
                      setDifficulty={setDifficulty}
                      flashcardCount={flashcardCount}
                      setFlashcardCount={setFlashcardCount}
                      multipleChoiceCount={multipleChoiceCount}
                      setMultipleChoiceCount={setMultipleChoiceCount}
                      trueFalseCount={trueFalseCount}
                      setTrueFalseCount={setTrueFalseCount}
                      onGenerate={handleGenerateActivities}
                      isGenerating={isGenerating}
                      generationProgress={generationProgress}
                      selectedTopicsCount={selectedTopicIds.length}
                    />
                  </div>
                ) : (
                  /* Step 4: Active Study Interface */
                  <div className="space-y-6">
                    {/* Navigation Tabs between Flashcards and Questions */}
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                      <div className="flex items-center gap-2">
                        {activityResult.flashcards.length > 0 && (
                          <button
                            type="button"
                            id="tab-view-flashcards"
                            onClick={() => setActiveTab('flashcards')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                              activeTab === 'flashcards'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            Flashcards ({activityResult.flashcards.length})
                          </button>
                        )}
                        {(activityResult.multipleChoiceQuestions.length > 0 ||
                          activityResult.trueFalseQuestions.length > 0) && (
                          <button
                            type="button"
                            id="tab-view-questions"
                            onClick={() => setActiveTab('questions')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                              activeTab === 'questions'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            Questões & Exercícios (
                            {activityResult.multipleChoiceQuestions.length + activityResult.trueFalseQuestions.length}
                            )
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        id="reconfigure-session-btn"
                        onClick={handleNewSession}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Nova Configuração</span>
                      </button>
                    </div>

                    {/* Warnings if any */}
                    {activityResult.warnings && activityResult.warnings.length > 0 && (
                      <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                        {activityResult.warnings.join(' ')}
                      </div>
                    )}

                    {/* Flashcards View */}
                    {activeTab === 'flashcards' && activityResult.flashcards.length > 0 && (
                      <FlashcardViewer
                        flashcards={activityResult.flashcards}
                        onFinish={() => {
                          if (
                            activityResult.multipleChoiceQuestions.length > 0 ||
                            activityResult.trueFalseQuestions.length > 0
                          ) {
                            setActiveTab('questions');
                          } else {
                            setIsSessionFinished(true);
                          }
                        }}
                      />
                    )}

                    {/* Questions View */}
                    {activeTab === 'questions' && (
                      <div className="space-y-6">
                        {/* Multiple Choice Questions */}
                        {activityResult.multipleChoiceQuestions.map((q, idx) => (
                          <MultipleChoiceCard
                            key={q.id}
                            question={q}
                            questionNumber={idx + 1}
                            totalQuestions={
                              activityResult.multipleChoiceQuestions.length + activityResult.trueFalseQuestions.length
                            }
                            onAnswered={handleQuestionAnswered}
                          />
                        ))}

                        {/* True/False Questions */}
                        {activityResult.trueFalseQuestions.map((q, idx) => (
                          <TrueFalseCard
                            key={q.id}
                            question={q}
                            questionNumber={activityResult.multipleChoiceQuestions.length + idx + 1}
                            totalQuestions={
                              activityResult.multipleChoiceQuestions.length + activityResult.trueFalseQuestions.length
                            }
                            onAnswered={handleQuestionAnswered}
                          />
                        ))}

                        {/* Session Finished Box */}
                        <div className="pt-4 flex justify-center">
                          <button
                            type="button"
                            id="finish-session-btn"
                            onClick={() => setIsSessionFinished(true)}
                            className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition"
                          >
                            Finalizar Sessão de Estudo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Session Summary Modal / View */}
                    {isSessionFinished && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <SessionSummary
                          score={score}
                          onRestart={() => {
                            setIsSessionFinished(false);
                            setScore({ correct: 0, total: 0 });
                          }}
                          onNewSession={handleNewSession}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        profileName={currentProfile?.name || 'Perfil'}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
      />
    </div>
  );
}
