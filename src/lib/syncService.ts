import { supabase } from './supabaseClient';
import { 
  getLocalProjects, 
  getLocalChapters, 
  getLocalScenes, 
  getLocalEntities, 
  getLocalMilestones,
  saveLocalProject,
  saveLocalChapter,
  saveLocalScene,
  saveLocalEntity,
  saveLocalMilestone,
  notifyDataUpdated 
} from './storage';
import { Project, Chapter, Scene, Entity, EntityMilestone } from '@/types';

export interface SyncResult {
  success: boolean;
  message: string;
  pushedCount?: number;
  pulledCount?: number;
  error?: string;
}

/**
 * Pushes a local project and all its nested resources to Supabase
 */
export async function pushProjectToSupabase(projectId: string, userId: string): Promise<SyncResult> {
  try {
    const project = getLocalProjects().find(p => p.id === projectId);
    if (!project) return { success: false, message: 'Proyecto no encontrado localmente' };

    // 1. Upsert project
    const { error: projError } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: userId,
      title: project.title,
      genre: project.genre || null,
      synopsis: project.synopsis || null,
      cover_url: project.cover_url || null,
      word_count: project.word_count || 0,
      archived: project.archived || false,
      updated_at: new Date().toISOString(),
    });
    if (projError) throw projError;

    // 2. Upsert chapters
    const chapters = getLocalChapters(projectId);
    if (chapters.length > 0) {
      const chapterPayload = chapters.map(c => ({
        id: c.id,
        project_id: projectId,
        user_id: userId,
        title: c.title,
        order_index: c.order_index,
        updated_at: new Date().toISOString(),
      }));
      const { error: chError } = await supabase.from('chapters').upsert(chapterPayload);
      if (chError) throw chError;
    }

    // 3. Upsert scenes
    const scenes = getLocalScenes(projectId);
    if (scenes.length > 0) {
      const scenePayload = scenes.map(s => ({
        id: s.id,
        chapter_id: s.chapter_id,
        project_id: projectId,
        user_id: userId,
        title: s.title,
        content: s.content || '',
        status: s.status,
        order_index: s.order_index,
        word_count: s.word_count || 0,
        last_edited_at: s.last_edited_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { error: scError } = await supabase.from('scenes').upsert(scenePayload);
      if (scError) throw scError;
    }

    // 4. Upsert entities
    const entities = getLocalEntities(projectId);
    if (entities.length > 0) {
      const entityPayload = entities.map(e => ({
        id: e.id,
        project_id: projectId,
        user_id: userId,
        type: e.type,
        name: e.name,
        aliases: e.aliases || [],
        image_url: e.image_url || null,
        age_origin: e.age_origin || null,
        appearance: e.appearance || null,
        personality: e.personality || null,
        background: e.background || null,
        role: e.role || null,
        tags: e.tags || [],
        updated_at: new Date().toISOString(),
      }));
      const { error: entError } = await supabase.from('entities').upsert(entityPayload);
      if (entError) throw entError;
    }

    // 5. Upsert milestones
    const milestones = getLocalMilestones(projectId);
    if (milestones.length > 0) {
      const milestonePayload = milestones.map(m => ({
        id: m.id,
        entity_id: m.entity_id,
        project_id: projectId,
        user_id: userId,
        scene_id: m.scene_id || null,
        category: m.category,
        description: m.description,
        order_index: m.order_index,
      }));
      const { error: mError } = await supabase.from('entity_milestones').upsert(milestonePayload);
      if (mError) throw mError;
    }

    return {
      success: true,
      message: 'Proyecto y Lore sincronizados exitosamente con Supabase',
      pushedCount: 1 + chapters.length + scenes.length + entities.length + milestones.length,
    };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return {
      success: false,
      message: err.message || 'Error al sincronizar con Supabase',
      error: String(err),
    };
  }
}

/**
 * Pulls all user projects and data from Supabase into local storage
 */
export async function pullProjectsFromSupabase(userId: string): Promise<SyncResult> {
  try {
    const { data: cloudProjects, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (pErr) throw pErr;
    if (!cloudProjects || cloudProjects.length === 0) {
      return { success: true, message: 'No hay proyectos en la nube para sincronizar', pulledCount: 0 };
    }

    let totalPulled = cloudProjects.length;

    for (const cp of cloudProjects) {
      saveLocalProject(cp as Project);

      // Fetch chapters
      const { data: chapters } = await supabase.from('chapters').select('*').eq('project_id', cp.id);
      if (chapters) {
        chapters.forEach(c => saveLocalChapter(c as Chapter));
        totalPulled += chapters.length;
      }

      // Fetch scenes
      const { data: scenes } = await supabase.from('scenes').select('*').eq('project_id', cp.id);
      if (scenes) {
        scenes.forEach(s => saveLocalScene(s as Scene));
        totalPulled += scenes.length;
      }

      // Fetch entities
      const { data: entities } = await supabase.from('entities').select('*').eq('project_id', cp.id);
      if (entities) {
        entities.forEach(e => saveLocalEntity(e as Entity));
        totalPulled += entities.length;
      }

      // Fetch milestones
      const { data: milestones } = await supabase.from('entity_milestones').select('*').eq('project_id', cp.id);
      if (milestones) {
        milestones.forEach(m => saveLocalMilestone(m as EntityMilestone));
        totalPulled += milestones.length;
      }
    }

    // Trigger global reactive force-update across the app
    notifyDataUpdated();

    return {
      success: true,
      message: `${cloudProjects.length} proyecto(s) descargados y sincronizados con éxito`,
      pulledCount: totalPulled,
    };
  } catch (err: any) {
    console.error('Error pulling from Supabase:', err);
    return {
      success: false,
      message: err.message || 'Error al descargar datos de Supabase',
      error: String(err),
    };
  }
}
