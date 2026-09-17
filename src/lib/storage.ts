import { 
  Project, 
  Chapter, 
  Scene, 
  Entity, 
  EntityMilestone, 
  AISettings, 
  FullProjectExport 
} from '@/types';

const STORAGE_KEYS = {
  PROJECTS: 'wf_projects',
  CHAPTERS: 'wf_chapters',
  SCENES: 'wf_scenes',
  ENTITIES: 'wf_entities',
  MILESTONES: 'wf_milestones',
  AI_SETTINGS: 'wf_ai_settings',
  LAST_ACTIVE_PROJECT: 'wf_last_active_project',
  LAST_ACTIVE_SCENE: 'wf_last_active_scene',
};

export const DATA_UPDATED_EVENT = 'wf_data_updated';

export function notifyDataUpdated(projectId?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DATA_UPDATED_EVENT, {
      detail: { projectId, timestamp: Date.now() },
    })
  );
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
  },
  fastModel: 'gemini-2.5-flash',
  reasoningModel: 'gemini-2.5-pro',
  models: {
    gemini: { fast: 'gemini-2.5-flash', reasoning: 'gemini-2.5-pro' },
    openai: { fast: 'gpt-4o-mini', reasoning: 'gpt-4o' },
    anthropic: { fast: 'claude-3-5-haiku-20241022', reasoning: 'claude-3-5-sonnet-20241022' },
  },
  useOnlyFastModels: false,
  autosaveInterval: 30,
};

// Starter demo data to make the app immediately testable out of the box
const INITIAL_DEMO_PROJECT_ID = 'demo-project-crepusculo';

function getInitialData() {
  const now = new Date().toISOString();

  const demoProject: Project = {
    id: INITIAL_DEMO_PROJECT_ID,
    title: 'Crónicas del Reino Crepuscular',
    genre: 'Fantasía Épica / Intriga',
    synopsis: 'En una tierra donde el sol se oculta por décadas, un erudito exiliado y una capitana rebelde descubren que el eclipse inminente no es natural.',
    cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    word_count: 540,
    created_at: now,
    updated_at: now,
  };

  const ch1: Chapter = {
    id: 'ch-1',
    project_id: INITIAL_DEMO_PROJECT_ID,
    title: 'Capítulo 1: El Amuleto Olvidado',
    order_index: 0,
    created_at: now,
    updated_at: now,
  };

  const ch2: Chapter = {
    id: 'ch-2',
    project_id: INITIAL_DEMO_PROJECT_ID,
    title: 'Capítulo 2: La Sombra en la Posada',
    order_index: 1,
    created_at: now,
    updated_at: now,
  };

  const sc1: Scene = {
    id: 'sc-1',
    chapter_id: 'ch-1',
    project_id: INITIAL_DEMO_PROJECT_ID,
    title: 'Escena 1: Silencio en la Torre',
    order_index: 0,
    word_count: 260,
    status: 'final',
    last_edited_at: now,
    created_at: now,
    updated_at: now,
    content: `El viento helado aullaba contra los vitrales empolvados de la Torre de Cristal. Eldrin examinaba los pergaminos con dedos temblorosos. Sobre la mesa de roble, el Amuleto de Obsidiana pulsaba con un tenue brillo carmesí, una reliquia que no debía haber despertado jamás.

—Si los exploradores de La Orden del Ocaso cruzan el desfiladero antes del amanecer, todo estará perdido —murmuró Eldrin para sí mismo, guardando el amuleto dentro de su túnica de viajero. Sabía que la torre ya no era un refugio seguro.`
  };

  const sc2: Scene = {
    id: 'sc-2',
    chapter_id: 'ch-1',
    project_id: INITIAL_DEMO_PROJECT_ID,
    title: 'Escena 2: Partida hacia las Tierras Bajas',
    order_index: 1,
    word_count: 140,
    status: 'revised',
    last_edited_at: now,
    created_at: now,
    updated_at: now,
    content: `Eldrin descendió por la escalera de caracol de la Torre de Cristal con el paso acelerado por la urgencia. Guardaba el Amuleto de Obsidiana firmemente sujeto a su cinto. A las puertas de la torre, la noche parecía más oscura de lo habitual. Debía llegar a la Posada del Cuervo antes de que las patrullas cerraran el paso.`
  };

  const sc3: Scene = {
    id: 'sc-3',
    chapter_id: 'ch-2',
    project_id: INITIAL_DEMO_PROJECT_ID,
    title: 'Escena 1: El Pacto en la Posada',
    order_index: 0,
    word_count: 140,
    status: 'draft',
    last_edited_at: now,
    created_at: now,
    updated_at: now,
    content: `En la Posada del Cuervo, el humo de turba y el olor a hidromiel barato llenaban el ambiente. Kaelen estaba sentada en un rincón oscuro, afilando su daga. Cuando Eldrin entró cubierto de nieve, ella levantó la vista con desconfianza. Ambos sabían que La Orden del Ocaso no tardaría en llegar.`
  };

  const entities: Entity[] = [
    {
      id: 'ent-1',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'character',
      name: 'Eldrin el Erudito',
      aliases: ['Eldrin', 'Maestro Eldrin'],
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      age_origin: '48 años, originario de Valdor',
      appearance: 'Túnicas gastadas de lana azul, ojos grises inquisitivos, barba entrecana y manos manchadas de tinta alquímica.',
      personality: 'Prudente, analítico y reservado. Teme el poder incontrolado de la magia antigua.',
      background: 'Antiguo archivista real desterrado tras negarse a destruir registros de reliquias prohibidas.',
      role: 'Protagonista',
      tags: ['mago', 'erudito', 'exiliado'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ent-2',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'character',
      name: 'Kaelen',
      aliases: ['Kaelen', 'La Loba del Norte'],
      image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      age_origin: '29 años, Tierras Bajas',
      appearance: 'Armadura ligera de cuero tachonado, capa de lobo gris, cicatriz fina sobre el pómulo izquierdo.',
      personality: 'Directa, escéptica y de reflejos letales. Valora los hechos sobre las palabras.',
      background: 'Líder de contrabandistas y desertora del ejército de las marcas fronterizas.',
      role: 'Aliada recelosa',
      tags: ['guerrera', 'rebelde', 'guía'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ent-3',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'location',
      name: 'Torre de Cristal',
      aliases: ['La Aguja', 'Torre de Cristal'],
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
      age_origin: 'Construida durante la Primera Dinastía',
      appearance: 'Estructura esbelta de piedra blanca pulida con una cúspide translúcida que capta la luz estelar.',
      background: 'Antiguo observatorio astrológico en lo alto del risco escarpado de Valdor.',
      role: 'Refugio inicial',
      tags: ['bastión', 'mágico', 'montaña'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ent-4',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'location',
      name: 'Posada del Cuervo',
      aliases: ['La Posada', 'Posada del Cuervo'],
      image_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop',
      appearance: 'Taberna rústica de vigas de roble negro y chimenea humeante en la encrucijada del valle.',
      background: 'Punto de reunión neutral para comerciantes, cazadores furtivos y proscritos.',
      role: 'Punto de encuentro',
      tags: ['taberna', 'valle', 'neutral'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ent-5',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'item',
      name: 'Amuleto de Obsidiana',
      aliases: ['El Amuleto', 'Amuleto de Obsidiana', 'Piedra Carmesí'],
      image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=400&auto=format&fit=crop',
      appearance: 'Disco de obsidiana negra pura con una runa grabada que emite un pulso rojo débil.',
      background: 'Reliquia milenaria capaz de canalizar o suprimir energías del Gran Eclipse.',
      role: 'MacGuffin / Reliquia central',
      tags: ['reliquia', 'mágico', 'artefacto'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ent-6',
      project_id: INITIAL_DEMO_PROJECT_ID,
      type: 'faction',
      name: 'La Orden del Ocaso',
      aliases: ['La Orden', 'El Ocaso', 'Inquisidores del Ocaso'],
      appearance: 'Visten armaduras de placas pavonadas y capas color ceniza.',
      background: 'Culto militarizado que busca provocar el Eclipse Eterno para purificar el continente.',
      role: 'Antagonistas',
      tags: ['culto', 'militar', 'enemigos'],
      created_at: now,
      updated_at: now,
    }
  ];

  const milestones: EntityMilestone[] = [
    {
      id: 'm-1',
      entity_id: 'ent-1', // Eldrin
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-1',
      category: 'location',
      description: 'Eldrin se encuentra en la Torre de Cristal estudiando pergaminos prohibidos.',
      order_index: 0,
      created_at: now,
    },
    {
      id: 'm-2',
      entity_id: 'ent-1', // Eldrin
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-1',
      category: 'possession',
      description: 'Eldrin tiene en su poder el Amuleto de Obsidiana y lo guarda en su túnica.',
      order_index: 1,
      created_at: now,
    },
    {
      id: 'm-3',
      entity_id: 'ent-5', // Amuleto
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-1',
      category: 'possession',
      description: 'El Amuleto de Obsidiana está en posesión de Eldrin en la Torre de Cristal.',
      order_index: 0,
      created_at: now,
    },
    {
      id: 'm-4',
      entity_id: 'ent-1', // Eldrin
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-2',
      category: 'location',
      description: 'Eldrin abandona la Torre de Cristal y viaja hacia las Tierras Bajas.',
      order_index: 0,
      created_at: now,
    },
    {
      id: 'm-5',
      entity_id: 'ent-2', // Kaelen
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-3',
      category: 'location',
      description: 'Kaelen espera en un rincón de la Posada del Cuervo.',
      order_index: 0,
      created_at: now,
    },
    {
      id: 'm-6',
      entity_id: 'ent-2', // Kaelen
      project_id: INITIAL_DEMO_PROJECT_ID,
      scene_id: 'sc-3',
      category: 'relationship',
      description: 'Kaelen desconfía de Eldrin pero acepta escuchar su propuesta frente a la amenaza de La Orden.',
      order_index: 1,
      created_at: now,
    }
  ];

  return {
    projects: [demoProject],
    chapters: [ch1, ch2],
    scenes: [sc1, sc2, sc3],
    entities,
    milestones,
  };
}

// Client Storage helper
function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

// Initialize starter data if empty
export function initializeStorageIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const existingProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!existingProjects || JSON.parse(existingProjects).length === 0) {
    const initial = getInitialData();
    safeSet(STORAGE_KEYS.PROJECTS, initial.projects);
    safeSet(STORAGE_KEYS.CHAPTERS, initial.chapters);
    safeSet(STORAGE_KEYS.SCENES, initial.scenes);
    safeSet(STORAGE_KEYS.ENTITIES, initial.entities);
    safeSet(STORAGE_KEYS.MILESTONES, initial.milestones);
  }
}

// Projects CRUD
export function getLocalProjects(): Project[] {
  initializeStorageIfNeeded();
  return safeGet<Project[]>(STORAGE_KEYS.PROJECTS, []);
}

export function saveLocalProject(project: Project): void {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === project.id);
  const updatedProject = { ...project, updated_at: new Date().toISOString() };
  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.unshift(updatedProject);
  }
  safeSet(STORAGE_KEYS.PROJECTS, projects);
}

export function deleteLocalProject(projectId: string): void {
  const projects = getLocalProjects().filter(p => p.id !== projectId);
  safeSet(STORAGE_KEYS.PROJECTS, projects);

  // Cascade delete chapters, scenes, entities, milestones
  const chapters = getLocalChapters(projectId);
  const remainingChapters = safeGet<Chapter[]>(STORAGE_KEYS.CHAPTERS, []).filter(c => c.project_id !== projectId);
  safeSet(STORAGE_KEYS.CHAPTERS, remainingChapters);

  const remainingScenes = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []).filter(s => s.project_id !== projectId);
  safeSet(STORAGE_KEYS.SCENES, remainingScenes);

  const remainingEntities = safeGet<Entity[]>(STORAGE_KEYS.ENTITIES, []).filter(e => e.project_id !== projectId);
  safeSet(STORAGE_KEYS.ENTITIES, remainingEntities);

  const remainingMilestones = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []).filter(m => m.project_id !== projectId);
  safeSet(STORAGE_KEYS.MILESTONES, remainingMilestones);
}

// Chapters CRUD
export function getLocalChapters(projectId: string): Chapter[] {
  initializeStorageIfNeeded();
  const all = safeGet<Chapter[]>(STORAGE_KEYS.CHAPTERS, []);
  return all.filter(c => c.project_id === projectId).sort((a, b) => a.order_index - b.order_index);
}

export function saveLocalChapter(chapter: Chapter): void {
  const all = safeGet<Chapter[]>(STORAGE_KEYS.CHAPTERS, []);
  const index = all.findIndex(c => c.id === chapter.id);
  const updated = { ...chapter, updated_at: new Date().toISOString() };
  if (index >= 0) {
    all[index] = updated;
  } else {
    all.push(updated);
  }
  safeSet(STORAGE_KEYS.CHAPTERS, all);
}

export function deleteLocalChapter(chapterId: string): void {
  const all = safeGet<Chapter[]>(STORAGE_KEYS.CHAPTERS, []).filter(c => c.id !== chapterId);
  safeSet(STORAGE_KEYS.CHAPTERS, all);

  // Cascade delete scenes in this chapter
  const remainingScenes = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []).filter(s => s.chapter_id !== chapterId);
  safeSet(STORAGE_KEYS.SCENES, remainingScenes);
}

// Scenes CRUD
export function getLocalScenes(projectId: string): Scene[] {
  initializeStorageIfNeeded();
  const all = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []);
  return all.filter(s => s.project_id === projectId).sort((a, b) => a.order_index - b.order_index);
}

export function saveLocalScene(scene: Scene): void {
  const all = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []);
  const index = all.findIndex(s => s.id === scene.id);
  const wordCount = scene.content.trim() ? scene.content.trim().split(/\s+/).length : 0;
  const updated: Scene = { 
    ...scene, 
    word_count: wordCount,
    last_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString() 
  };
  if (index >= 0) {
    all[index] = updated;
  } else {
    all.push(updated);
  }
  safeSet(STORAGE_KEYS.SCENES, all);

  // Recalculate total project word count
  updateProjectWordCount(scene.project_id);
}

export function deleteLocalScene(sceneId: string, projectId: string): void {
  const all = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []).filter(s => s.id !== sceneId);
  safeSet(STORAGE_KEYS.SCENES, all);
  updateProjectWordCount(projectId);
}

function updateProjectWordCount(projectId: string): void {
  const scenes = getLocalScenes(projectId);
  const totalWords = scenes.reduce((acc, s) => acc + (s.word_count || 0), 0);
  const projects = getLocalProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    project.word_count = totalWords;
    saveLocalProject(project);
  }
}

// Entities CRUD
export function getLocalEntities(projectId: string): Entity[] {
  initializeStorageIfNeeded();
  const all = safeGet<Entity[]>(STORAGE_KEYS.ENTITIES, []);
  return all.filter(e => e.project_id === projectId);
}

export function saveLocalEntity(entity: Entity): void {
  const all = safeGet<Entity[]>(STORAGE_KEYS.ENTITIES, []);
  const index = all.findIndex(e => e.id === entity.id);
  const updated = { ...entity, updated_at: new Date().toISOString() };
  if (index >= 0) {
    all[index] = updated;
  } else {
    all.push(updated);
  }
  safeSet(STORAGE_KEYS.ENTITIES, all);
}

export function deleteLocalEntity(entityId: string): void {
  const all = safeGet<Entity[]>(STORAGE_KEYS.ENTITIES, []).filter(e => e.id !== entityId);
  safeSet(STORAGE_KEYS.ENTITIES, all);

  // Also delete associated milestones
  const remainingMilestones = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []).filter(m => m.entity_id !== entityId);
  safeSet(STORAGE_KEYS.MILESTONES, remainingMilestones);
}

// Milestones CRUD
export function getLocalMilestones(projectId: string): EntityMilestone[] {
  initializeStorageIfNeeded();
  const all = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []);
  return all.filter(m => m.project_id === projectId).sort((a, b) => a.order_index - b.order_index);
}

export function saveLocalMilestone(milestone: EntityMilestone): void {
  const all = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []);
  const index = all.findIndex(m => m.id === milestone.id);
  if (index >= 0) {
    all[index] = milestone;
  } else {
    all.push(milestone);
  }
  safeSet(STORAGE_KEYS.MILESTONES, all);
}

export function deleteLocalMilestone(milestoneId: string): void {
  const all = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []).filter(m => m.id !== milestoneId);
  safeSet(STORAGE_KEYS.MILESTONES, all);
}

// AI Settings
export function getLocalAISettings(): AISettings {
  const current = safeGet<AISettings>(STORAGE_KEYS.AI_SETTINGS, DEFAULT_AI_SETTINGS);
  let hasChanged = false;

  // Migrate older Gemini model names if present
  if (current.fastModel === 'gemini-1.5-flash') {
    current.fastModel = 'gemini-2.5-flash';
    hasChanged = true;
  }
  if (current.reasoningModel === 'gemini-1.5-pro') {
    current.reasoningModel = 'gemini-2.5-pro';
    hasChanged = true;
  }

  // Ensure apiKeys mapping exists and is synchronized
  if (!current.apiKeys) {
    current.apiKeys = {
      gemini: current.provider === 'gemini' ? (current.apiKey || '') : '',
      openai: current.provider === 'openai' ? (current.apiKey || '') : '',
      anthropic: current.provider === 'anthropic' ? (current.apiKey || '') : '',
    };
    hasChanged = true;
  } else if (current.apiKey && !current.apiKeys[current.provider]) {
    current.apiKeys[current.provider] = current.apiKey;
    hasChanged = true;
  }

  if (!current.models) {
    current.models = {
      gemini: { fast: 'gemini-2.5-flash', reasoning: 'gemini-2.5-pro' },
      openai: { fast: 'gpt-4o-mini', reasoning: 'gpt-4o' },
      anthropic: { fast: 'claude-3-5-haiku-20241022', reasoning: 'claude-3-5-sonnet-20241022' },
    };
    hasChanged = true;
  }

  if (hasChanged) {
    saveLocalAISettings(current);
  }

  return current;
}

export function saveLocalAISettings(settings: AISettings): void {
  safeSet(STORAGE_KEYS.AI_SETTINGS, settings);
}

// Last Active Project / Scene
export function getLastActiveProjectId(): string | null {
  return safeGet<string | null>(STORAGE_KEYS.LAST_ACTIVE_PROJECT, null);
}

export function setLastActiveProjectId(projectId: string): void {
  safeSet(STORAGE_KEYS.LAST_ACTIVE_PROJECT, projectId);
}

export function getLastActiveSceneId(projectId: string): string | null {
  const map = safeGet<Record<string, string>>(STORAGE_KEYS.LAST_ACTIVE_SCENE, {});
  return map[projectId] || null;
}

export function setLastActiveSceneId(projectId: string, sceneId: string): void {
  const map = safeGet<Record<string, string>>(STORAGE_KEYS.LAST_ACTIVE_SCENE, {});
  map[projectId] = sceneId;
  safeSet(STORAGE_KEYS.LAST_ACTIVE_SCENE, map);
}

// EXPORT / IMPORT TO JSON (Offline-First Single Standard)
export function exportProjectToJSON(projectId: string): string {
  const projects = getLocalProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');

  const chapters = getLocalChapters(projectId);
  const scenes = getLocalScenes(projectId);
  const entities = getLocalEntities(projectId);
  const milestones = getLocalMilestones(projectId);

  const exportData: FullProjectExport = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    project,
    chapters,
    scenes,
    entities,
    milestones,
  };

  return JSON.stringify(exportData, null, 2);
}

export function importProjectFromJSON(jsonString: string): Project {
  const data: FullProjectExport = JSON.parse(jsonString);
  if (!data.project || !data.project.title) {
    throw new Error('Formato de archivo JSON inválido: falta el objeto project');
  }

  const projectId = data.project.id || ('proj-' + Math.random().toString(36).substring(2, 9));
  const importedProject: Project = {
    ...data.project,
    id: projectId,
    title: data.project.title,
    updated_at: new Date().toISOString(),
  };

  // 1. Projects: Update in-place if project with same ID exists, or prepend
  const existingProjects = getLocalProjects();
  const existingIndex = existingProjects.findIndex(p => p.id === projectId);
  if (existingIndex >= 0) {
    existingProjects[existingIndex] = importedProject;
  } else {
    existingProjects.unshift(importedProject);
  }
  safeSet(STORAGE_KEYS.PROJECTS, existingProjects);

  // 2. Chapters: Replace chapters for this project
  const otherChapters = safeGet<Chapter[]>(STORAGE_KEYS.CHAPTERS, []).filter(c => c.project_id !== projectId);
  const importedChapters: Chapter[] = (data.chapters || []).map(ch => ({
    ...ch,
    project_id: projectId,
  }));
  safeSet(STORAGE_KEYS.CHAPTERS, [...otherChapters, ...importedChapters]);

  // 3. Scenes: Replace scenes for this project
  const otherScenes = safeGet<Scene[]>(STORAGE_KEYS.SCENES, []).filter(s => s.project_id !== projectId);
  const importedScenes: Scene[] = (data.scenes || []).map(sc => ({
    ...sc,
    project_id: projectId,
  }));
  safeSet(STORAGE_KEYS.SCENES, [...otherScenes, ...importedScenes]);

  // 4. Entities: Replace entities for this project
  const otherEntities = safeGet<Entity[]>(STORAGE_KEYS.ENTITIES, []).filter(e => e.project_id !== projectId);
  const importedEntities: Entity[] = (data.entities || []).map(ent => ({
    ...ent,
    project_id: projectId,
  }));
  safeSet(STORAGE_KEYS.ENTITIES, [...otherEntities, ...importedEntities]);

  // 5. Milestones: Replace milestones for this project
  const otherMilestones = safeGet<EntityMilestone[]>(STORAGE_KEYS.MILESTONES, []).filter(m => m.project_id !== projectId);
  const importedMilestones: EntityMilestone[] = (data.milestones || []).map(m => ({
    ...m,
    project_id: projectId,
  }));
  safeSet(STORAGE_KEYS.MILESTONES, [...otherMilestones, ...importedMilestones]);

  setLastActiveProjectId(projectId);
  if (importedScenes.length > 0) {
    setLastActiveSceneId(projectId, importedScenes[0].id);
  }

  // Recalculate word count
  updateProjectWordCount(projectId);

  // Trigger global reactive force-update across all active views/cards/editors
  notifyDataUpdated(projectId);

  return importedProject;
}
