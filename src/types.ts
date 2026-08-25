export interface Profile {
  id: string;
  name: string;
  avatarIcon?: string;
  createdAt: string;
}

export interface StudyProject {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  goal?: string;
  createdAt: string;
}

export interface MaterialTopic {
  id: string;
  title: string;
  sectionType: 'chapter' | 'section' | 'topic' | 'subtopic';
  orderIndex: number;
  pageReference?: string;
  summary: string;
  keyConcepts: string[];
  excerptContent?: string;
}

export interface ProcessedMaterial {
  id: string;
  projectId: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'text_paste';
  rawText: string;
  topics: MaterialTopic[];
  extractedAt: string;
}

export type StudyMode = 'faithful' | 'complementary';
export type StudyDifficulty = 'auto' | 'basic' | 'intermediate' | 'advanced' | 'mixed';

export interface Flashcard {
  id: string;
  topicId?: string;
  front: string;
  back: string;
  tip?: string;
  sourceReference: string;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  topicId?: string;
  prompt: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
  explanation: string;
  sourceReference: string;
  difficulty?: string;
}

export interface TrueFalseQuestion {
  id: string;
  topicId?: string;
  statement: string;
  isTrue: boolean;
  justification: string;
  sourceReference: string;
  difficulty?: string;
}

export interface ActivityGenerationConfig {
  materialTitle: string;
  selectedTopics: MaterialTopic[];
  combinedContent: string;
  mode: StudyMode;
  difficulty: StudyDifficulty;
  flashcardCount: number;
  multipleChoiceCount: number;
  trueFalseCount: number;
}

export interface ActivityGenerationResult {
  flashcards: Flashcard[];
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  trueFalseQuestions: TrueFalseQuestion[];
  warnings?: string[];
}

export interface ActivityAnswer {
  activityId: string;
  activityType: 'multiple_choice' | 'true_false' | 'flashcard';
  userResponse: string | boolean;
  isCorrect?: boolean;
  answeredAt: string;
}
