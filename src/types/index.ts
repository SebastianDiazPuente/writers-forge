export type EntityType = 'character' | 'faction' | 'location' | 'item';

export type SceneStatus = 'draft' | 'revised' | 'final';

export type MilestoneCategory = 'location' | 'relationship' | 'possession' | 'other';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface Project {
  id: string;
  user_id?: string;
  title: string;
  genre?: string;
  synopsis?: string;
  cover_url?: string;
  word_count: number;
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  user_id?: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  chapter_id: string;
  project_id: string;
  user_id?: string;
  title: string;
  content: string;
  status: SceneStatus;
  order_index: number;
  word_count: number;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: string;
  project_id: string;
  user_id?: string;
  type: EntityType;
  name: string;
  aliases: string[];
  image_url?: string;
  age_origin?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  role?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface EntityMilestone {
  id: string;
  entity_id: string;
  project_id: string;
  user_id?: string;
  scene_id?: string;
  chapter_id?: string;
  category: MilestoneCategory;
  description: string;
  order_index: number;
  created_at: string;
}

export interface AISettings {
  provider: AIProvider;
  apiKey: string; // legacy / active provider key fallback
  apiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
  fastModel: string;
  reasoningModel: string;
  models?: {
    gemini?: { fast: string; reasoning: string };
    openai?: { fast: string; reasoning: string };
    anthropic?: { fast: string; reasoning: string };
  };
  useOnlyFastModels?: boolean;
  autosaveInterval: number; // in seconds
}

export interface AIFallbackEventDetail {
  originalProvider: AIProvider;
  originalModel: string;
  fallbackProvider: AIProvider;
  fallbackModel: string;
  reason: string;
}

export interface PolishProposal {
  originalText: string;
  improvedText: string;
  toneInstruction?: string;
  timestamp: string;
}

export interface CoherenceIssue {
  id: string;
  entityId?: string;
  entityName?: string;
  category: MilestoneCategory;
  severity: 'warning' | 'error';
  title: string;
  issue: string;
  explanation: string;
  suggestion: string;
}

export interface CoherenceReport {
  timestamp: string;
  sceneId: string;
  sceneTitle: string;
  cutoffSceneOrder: number;
  filterCategories: MilestoneCategory[];
  issues: CoherenceIssue[];
  summary: string;
}

export interface ProposedStateUpdate {
  id: string;
  entityId: string;
  entityName: string;
  category: MilestoneCategory;
  description: string;
  confidence: number;
  approved: boolean;
}

export interface FullProjectExport {
  version: string;
  exported_at: string;
  project: Project;
  chapters: Chapter[];
  scenes: Scene[];
  entities: Entity[];
  milestones: EntityMilestone[];
}
