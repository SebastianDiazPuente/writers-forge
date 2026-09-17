'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Maximize2, 
  Minimize2, 
  Save, 
  Eye, 
  EyeOff, 
  X, 
  ExternalLink, 
  Check, 
  Trash2, 
  Edit2, 
  Filter, 
  Compass, 
  Layers, 
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  Project, 
  Chapter, 
  Scene, 
  Entity, 
  EntityMilestone, 
  SceneStatus, 
  MilestoneCategory, 
  CoherenceIssue, 
  ProposedStateUpdate,
  PolishProposal 
} from '@/types';
import { 
  getLocalChapters, 
  getLocalScenes, 
  getLocalEntities, 
  getLocalMilestones, 
  saveLocalChapter, 
  saveLocalScene, 
  deleteLocalChapter, 
  deleteLocalScene, 
  saveLocalMilestone, 
  getLocalAISettings,
  getLastActiveSceneId,
  setLastActiveSceneId,
  DATA_UPDATED_EVENT 
} from '@/lib/storage';
import { detectEntitiesInText, segmentTextWithHighlights } from '@/lib/entityDetector';
import { 
  filterMilestonesByTimeTravel, 
  formatLoreForPrompt, 
  buildCoherencePrompt, 
  buildStateUpdatePrompt,
  buildPolishingPrompt 
} from '@/lib/ai/prompts';
import { callLLM } from '@/lib/ai/client';

interface WorkspaceViewProps {
  project: Project;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ project }) => {
  // Navigation Tree State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [milestones, setMilestones] = useState<EntityMilestone[]>([]);

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorStatus, setEditorStatus] = useState<SceneStatus>('draft');
  const [highlightEntities, setHighlightEntities] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Debounced Detected Entities in current scene
  const [detectedMentions, setDetectedMentions] = useState<any[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Modal Entity Preview
  const [quickEntity, setQuickEntity] = useState<Entity | null>(null);

  // Coherence Engine State
  const [coherenceFilters, setCoherenceFilters] = useState<MilestoneCategory[]>([
    'location', 
    'relationship', 
    'possession'
  ]);
  const [isAuditingCoherence, setIsAuditingCoherence] = useState(false);
  const [coherenceReport, setCoherenceReport] = useState<{
    summary: string;
    issues: CoherenceIssue[];
    cutoffOrder: number;
    excludedCount: number;
  } | null>(null);

  // Auto State Updater State
  const [isUpdatingStates, setIsUpdatingStates] = useState(false);
  const [proposedUpdates, setProposedUpdates] = useState<ProposedStateUpdate[]>([]);
  const [acceptedUpdatesCount, setAcceptedUpdatesCount] = useState(0);

  // Tone & Polishing State
  const [toneInstruction, setToneInstruction] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishProposal, setPolishProposal] = useState<PolishProposal | null>(null);
  const [polishFeedback, setPolishFeedback] = useState<string | null>(null);

  // New Chapter / Scene inline inputs
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingSceneForChapterId, setAddingSceneForChapterId] = useState<string | null>(null);
  const [newSceneTitle, setNewSceneTitle] = useState('');

  // 1. Load workspace data
  const refreshData = () => {
    const chList = getLocalChapters(project.id);
    const scList = getLocalScenes(project.id);
    const entList = getLocalEntities(project.id);
    const msList = getLocalMilestones(project.id);

    setChapters(chList);
    setScenes(scList);
    setEntities(entList);
    setMilestones(msList);

    // Initial expanded chapters
    const expMap: Record<string, boolean> = {};
    chList.forEach(c => { expMap[c.id] = true; });
    setExpandedChapters(prev => ({ ...expMap, ...prev }));

    // Select last active scene or first scene available
    const lastSceneId = getLastActiveSceneId(project.id);
    const targetScene = scList.find(s => s.id === lastSceneId) || scList[0];
    if (targetScene && !activeSceneId) {
      loadScene(targetScene);
    }
  };

  useEffect(() => {
    refreshData();

    // Global reactive update listener (e.g. upon JSON import or Supabase sync)
    const handleDataUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.projectId || detail.projectId === project.id) {
        const chList = getLocalChapters(project.id);
        const scList = getLocalScenes(project.id);
        const entList = getLocalEntities(project.id);
        const msList = getLocalMilestones(project.id);

        setChapters(chList);
        setScenes(scList);
        setEntities(entList);
        setMilestones(msList);

        // Force update the current active scene in the editor with new data
        const currentTargetId = activeSceneId || getLastActiveSceneId(project.id);
        const target = scList.find(s => s.id === currentTargetId) || scList[0];
        if (target) {
          setActiveSceneId(target.id);
          setEditorTitle(target.title);
          setEditorContent(target.content || '');
          setEditorStatus(target.status);
          runDebouncedEntityDetection(target.content || '', entList);
        }
      }
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [project.id, activeSceneId]);

  // Load a scene into the editor
  const loadScene = (sc: Scene) => {
    setActiveSceneId(sc.id);
    setEditorTitle(sc.title);
    setEditorContent(sc.content || '');
    setEditorStatus(sc.status);
    setLastActiveSceneId(project.id, sc.id);
    setCoherenceReport(null);
    setProposedUpdates([]);
    setPolishProposal(null);
    setPolishFeedback(null);

    // Run initial entity detection
    runDebouncedEntityDetection(sc.content || '', entities);
  };

  // Active scene object
  const activeScene = useMemo(() => {
    return scenes.find(s => s.id === activeSceneId) || null;
  }, [scenes, activeSceneId]);

  // High-performance Debounced Entity Detection (500ms delay)
  const runDebouncedEntityDetection = (text: string, currentEntities: Entity[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const matches = detectEntitiesInText(text, currentEntities);
      setDetectedMentions(matches);
    }, 500);
  };

  // Handle content change with debounce autosave
  const handleContentChange = (newText: string) => {
    setEditorContent(newText);
    setSaveStatus('saving');

    // Run debounced entity detection
    runDebouncedEntityDetection(newText, entities);

    // Debounced autosave
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (activeScene) {
        saveLocalScene({
          ...activeScene,
          title: editorTitle,
          content: newText,
          status: editorStatus,
        });
        setSaveStatus('saved');
        // Refresh scene list to keep words count in sync
        setScenes(getLocalScenes(project.id));
      }
    }, 800);
  };

  // Save scene status or title changes
  const handleSaveSceneMeta = (updatedTitle: string, updatedStatus: SceneStatus) => {
    if (!activeScene) return;
    setEditorTitle(updatedTitle);
    setEditorStatus(updatedStatus);
    saveLocalScene({
      ...activeScene,
      title: updatedTitle,
      content: editorContent,
      status: updatedStatus,
    });
    setScenes(getLocalScenes(project.id));
  };

  // Create new chapter
  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    const newCh: Chapter = {
      id: 'ch-' + Math.random().toString(36).substring(2, 9),
      project_id: project.id,
      title: newChapterTitle.trim(),
      order_index: chapters.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalChapter(newCh);
    setNewChapterTitle('');
    setIsAddingChapter(false);
    setChapters(getLocalChapters(project.id));
    setExpandedChapters(prev => ({ ...prev, [newCh.id]: true }));
  };

  // Create new scene in a chapter
  const handleCreateScene = (chapterId: string) => {
    if (!newSceneTitle.trim()) return;
    const scenesInChapter = scenes.filter(s => s.chapter_id === chapterId);
    const newSc: Scene = {
      id: 'sc-' + Math.random().toString(36).substring(2, 9),
      chapter_id: chapterId,
      project_id: project.id,
      title: newSceneTitle.trim(),
      content: '',
      status: 'draft',
      order_index: scenesInChapter.length,
      word_count: 0,
      last_edited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalScene(newSc);
    setNewSceneTitle('');
    setAddingSceneForChapterId(null);
    const updatedScenes = getLocalScenes(project.id);
    setScenes(updatedScenes);
    loadScene(newSc);
  };

  // Delete scene
  const handleDeleteScene = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta escena?')) {
      deleteLocalScene(sceneId, project.id);
      const remaining = getLocalScenes(project.id);
      setScenes(remaining);
      if (activeSceneId === sceneId) {
        if (remaining.length > 0) loadScene(remaining[0]);
        else setActiveSceneId(null);
      }
    }
  };

  // Delete chapter
  const handleDeleteChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este capítulo y todas sus escenas?')) {
      deleteLocalChapter(chapterId);
      const remCh = getLocalChapters(project.id);
      const remSc = getLocalScenes(project.id);
      setChapters(remCh);
      setScenes(remSc);
      if (remSc.length > 0) loadScene(remSc[0]);
      else setActiveSceneId(null);
    }
  };

  // Toggle filter category for coherence audit
  const toggleFilter = (cat: MilestoneCategory) => {
    if (coherenceFilters.includes(cat)) {
      if (coherenceFilters.length > 1) {
        setCoherenceFilters(coherenceFilters.filter(c => c !== cat));
      }
    } else {
      setCoherenceFilters([...coherenceFilters, cat]);
    }
  };

  // MOTOR DE COHERENCIA CON RECORTE TEMPORAL (TIME-TRAVEL CONTEXT)
  const handleVerifyCoherence = async () => {
    if (!activeScene || !editorContent.trim()) return;
    setIsAuditingCoherence(true);
    setCoherenceReport(null);

    try {
      // 1. Apply strict Time-Travel slicing: discard any milestone from future scenes
      const { allowedMilestones, excludedCount, currentSceneOrder } = filterMilestonesByTimeTravel(
        milestones,
        activeScene.id,
        chapters,
        scenes,
        coherenceFilters
      );

      // 2. Format Lore context
      const loreContext = formatLoreForPrompt(entities, allowedMilestones);

      // 3. Build Prompt
      const prompt = buildCoherencePrompt(
        editorTitle,
        editorContent,
        loreContext,
        coherenceFilters
      );

      const aiSettings = getLocalAISettings();
      const rawResponse = await callLLM({
        userPrompt: prompt,
        settings: aiSettings,
        modelType: 'reasoning',
        responseFormat: 'json',
      });

      const parsed = JSON.parse(rawResponse);
      setCoherenceReport({
        summary: parsed.summary || 'Verificación completada.',
        issues: parsed.issues || [],
        cutoffOrder: currentSceneOrder + 1,
        excludedCount,
      });
    } catch (err: any) {
      console.error('Error verifying coherence:', err);
      alert('Error en la verificación de coherencia: ' + err.message);
    } finally {
      setIsAuditingCoherence(false);
    }
  };

  // ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
  const handleUpdateStates = async () => {
    if (!activeScene || !editorContent.trim()) return;
    setIsUpdatingStates(true);
    setProposedUpdates([]);
    setAcceptedUpdatesCount(0);

    try {
      const prompt = buildStateUpdatePrompt(editorTitle, editorContent, entities);
      const aiSettings = getLocalAISettings();
      const raw = await callLLM({
        userPrompt: prompt,
        settings: aiSettings,
        modelType: 'fast',
        responseFormat: 'json',
      });

      const parsed = JSON.parse(raw);
      const updates: ProposedStateUpdate[] = (parsed.updates || []).map((u: any) => {
        const matchedEnt = entities.find(e => e.name.toLowerCase() === u.entityName?.toLowerCase());
        return {
          id: 'upd-' + Math.random().toString(36).substring(2, 7),
          entityId: matchedEnt ? matchedEnt.id : (entities[0]?.id || ''),
          entityName: u.entityName || 'Entidad',
          category: u.category || 'other',
          description: u.description || '',
          confidence: u.confidence || 0.9,
          approved: true,
        };
      });

      setProposedUpdates(updates);
    } catch (err: any) {
      console.error('Error extracting state updates:', err);
      alert('Error al extraer estados: ' + err.message);
    } finally {
      setIsUpdatingStates(false);
    }
  };

  // One-click accept proposed state updates into Lore Milestones
  const handleAcceptUpdates = () => {
    if (!activeScene) return;
    const toApply = proposedUpdates.filter(u => u.approved && u.entityId);
    if (toApply.length === 0) return;

    toApply.forEach(up => {
      const newMilestone: EntityMilestone = {
        id: 'm-' + Math.random().toString(36).substring(2, 9),
        entity_id: up.entityId,
        project_id: project.id,
        scene_id: activeScene.id,
        chapter_id: activeScene.chapter_id,
        category: up.category,
        description: up.description,
        order_index: milestones.length,
        created_at: new Date().toISOString(),
      };
      saveLocalMilestone(newMilestone);
    });

    setAcceptedUpdatesCount(toApply.length);
    setProposedUpdates([]);
    setMilestones(getLocalMilestones(project.id));
  };

  // MOTOR DE PULIDO Y TONO DE REDACCIÓN
  const handlePolishScene = async () => {
    if (!activeScene || !editorContent.trim()) return;
    setIsPolishing(true);
    setPolishFeedback(null);

    try {
      const prompt = buildPolishingPrompt(editorTitle, editorContent, toneInstruction);
      const aiSettings = getLocalAISettings();
      const improved = await callLLM({
        userPrompt: prompt,
        settings: aiSettings,
        modelType: 'fast',
        responseFormat: 'text',
      });

      if (!improved || !improved.trim()) {
        throw new Error('La respuesta de la IA no contiene texto.');
      }

      setPolishProposal({
        originalText: editorContent,
        improvedText: improved.trim(),
        toneInstruction: toneInstruction.trim() || undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al pulir la escena:', err);
      alert(err.message || 'Error al conectar con el servicio de IA para pulir la escena.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleApplyPolish = () => {
    if (!polishProposal || !activeScene) return;
    const newText = polishProposal.improvedText;
    setEditorContent(newText);
    saveLocalScene({
      ...activeScene,
      title: editorTitle,
      content: newText,
      status: editorStatus,
    });
    setScenes(getLocalScenes(project.id));
    setPolishProposal(null);
    setPolishFeedback('¡Texto mejorado aplicado con éxito en el editor!');
    setTimeout(() => setPolishFeedback(null), 4000);
    runDebouncedEntityDetection(newText, entities);
  };

  const handleDiscardPolish = () => {
    setPolishProposal(null);
  };

  // Word count helper
  const currentWords = useMemo(() => {
    return editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
  }, [editorContent]);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      background: 'var(--bg-main)',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* ========================================================================= */}
      {/* 1. COLUMNA IZQUIERDA: Árbol Jerárquico de Capítulos y Escenas             */}
      {/* ========================================================================= */}
      {!isZenMode && (
        <aside style={{
          width: '280px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          {/* Header of Column 1 */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} style={{ color: 'var(--accent-amber)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Estructura del Libro
              </span>
            </div>
            <button
              onClick={() => setIsAddingChapter(true)}
              className="btn btn-ghost btn-sm"
              title="Añadir nuevo capítulo"
              style={{ color: 'var(--accent-amber)', padding: '0.25rem 0.5rem' }}
            >
              <Plus size={15} />
              <span>Capítulo</span>
            </button>
          </div>

          {/* New Chapter Inline Form */}
          {isAddingChapter && (
            <form onSubmit={handleCreateChapter} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <input
                type="text"
                autoFocus
                placeholder="Título del Capítulo..."
                value={newChapterTitle}
                onChange={e => setNewChapterTitle(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.825rem', padding: '0.4rem 0.6rem', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                <button type="button" onClick={() => setIsAddingChapter(false)} className="btn btn-ghost btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold btn-sm">
                  Guardar
                </button>
              </div>
            </form>
          )}

          {/* Scrollable Chapters & Scenes List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
            {chapters.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <p style={{ marginBottom: '0.75rem' }}>No hay capítulos aún.</p>
                <button onClick={() => setIsAddingChapter(true)} className="btn btn-secondary btn-sm">
                  <Plus size={14} /> Crear Capítulo
                </button>
              </div>
            ) : (
              chapters.map(ch => {
                const chapterScenes = scenes.filter(s => s.chapter_id === ch.id).sort((a, b) => a.order_index - b.order_index);
                const isExpanded = expandedChapters[ch.id] !== false;

                return (
                  <div key={ch.id} style={{ marginBottom: '0.75rem' }}>
                    {/* Chapter Header Item */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => setExpandedChapters(prev => ({ ...prev, [ch.id]: !isExpanded }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                        {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ch.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setAddingSceneForChapterId(ch.id);
                            setNewSceneTitle('');
                          }}
                          className="btn btn-ghost btn-sm"
                          title="Añadir escena a este capítulo"
                          style={{ padding: '0.2rem 0.35rem', color: 'var(--text-muted)' }}
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={e => handleDeleteChapter(ch.id, e)}
                          className="btn btn-ghost btn-sm"
                          title="Eliminar capítulo"
                          style={{ padding: '0.2rem 0.35rem', color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* New Scene Inline Input */}
                    {addingSceneForChapterId === ch.id && (
                      <div style={{ padding: '0.5rem 0.5rem 0.5rem 1.75rem' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Nombre de la Escena..."
                          value={newSceneTitle}
                          onChange={e => setNewSceneTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateScene(ch.id);
                            if (e.key === 'Escape') setAddingSceneForChapterId(null);
                          }}
                          className="form-input"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', marginBottom: '0.35rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button onClick={() => setAddingSceneForChapterId(null)} className="btn btn-ghost btn-sm">
                            Cancelar
                          </button>
                          <button onClick={() => handleCreateScene(ch.id)} className="btn btn-primary btn-sm">
                            Añadir
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scenes Tree */}
                    {isExpanded && (
                      <div style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
                        {chapterScenes.map(sc => {
                          const isSelected = sc.id === activeSceneId;
                          return (
                            <div
                              key={sc.id}
                              onClick={() => loadScene(sc)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.45rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '0.15rem',
                                cursor: 'pointer',
                                background: isSelected ? 'var(--accent-indigo-glow)' : 'transparent',
                                border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                transition: 'all var(--transition-fast)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                <FileText size={14} style={{ color: isSelected ? 'var(--accent-indigo)' : 'var(--text-muted)', flexShrink: 0 }} />
                                <span style={{
                                  fontSize: '0.825rem',
                                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                  fontWeight: isSelected ? 600 : 400,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {sc.title}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {/* Status badge indicator */}
                                <span 
                                  className={`badge badge-${sc.status}`} 
                                  style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
                                  title={`Estado: ${sc.status}`}
                                >
                                  {sc.status === 'draft' ? 'Borrador' : sc.status === 'revised' ? 'Revisado' : 'Final'}
                                </span>

                                <button
                                  onClick={e => handleDeleteScene(sc.id, e)}
                                  className="btn btn-ghost btn-sm"
                                  title="Eliminar escena"
                                  style={{ padding: '0.2rem', opacity: isSelected ? 1 : 0.4 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. COLUMNA CENTRAL: Lienzo de Escritura y Editor de Texto                */}
      {/* ========================================================================= */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: isZenMode ? '#07090e' : 'var(--bg-main)',
      }}>
        {/* Editor Toolbar */}
        <div style={{
          padding: '0.75rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(14, 18, 27, 0.6)',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Left: Title & Status Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <input
              type="text"
              value={editorTitle}
              onChange={e => handleSaveSceneMeta(e.target.value, editorStatus)}
              placeholder="Título de la Escena..."
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                maxWidth: '400px',
              }}
            />

            {/* Status Selector */}
            <select
              value={editorStatus}
              onChange={e => handleSaveSceneMeta(editorTitle, e.target.value as SceneStatus)}
              className="form-select"
              style={{
                width: 'auto',
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <option value="draft">Borrador</option>
              <option value="revised">Revisado</option>
              <option value="final">Final</option>
            </select>

            <span style={{ fontSize: '0.75rem', color: saveStatus === 'saving' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
              {saveStatus === 'saving' ? 'Guardando en local...' : 'Guardado'}
            </span>
          </div>

          {/* Right: Word Count & Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.3rem 0.6rem',
              borderRadius: 'var(--radius-sm)'
            }}>
              {currentWords.toLocaleString()} palabras
            </span>

            {/* Toggle Dynamic Entity Highlighting */}
            <button
              onClick={() => setHighlightEntities(!highlightEntities)}
              className={`btn btn-sm ${highlightEntities ? 'btn-primary' : 'btn-secondary'}`}
              title="Resaltar entidades del Lore en el texto"
            >
              {highlightEntities ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{highlightEntities ? 'Resaltado ON' : 'Resaltar Lore'}</span>
            </button>

            {/* Zen Mode Toggle */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className="btn btn-ghost btn-sm"
              title={isZenMode ? 'Salir de Modo Zen' : 'Modo Zen (Pantalla completa)'}
            >
              {isZenMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Toolbar de Pulido y Tono de Redacción */}
        <div style={{
          padding: '0.65rem 2rem',
          background: 'rgba(20, 24, 36, 0.65)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Sparkles size={15} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Instrucciones de Tono/Estilo (ej. 'Hazlo más sombrío', 'Reduce la longitud', 'Aumenta la tensión cromática')..."
              value={toneInstruction}
              onChange={e => setToneInstruction(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handlePolishScene();
              }}
              className="form-input"
              style={{
                fontSize: '0.825rem',
                padding: '0.4rem 0.75rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handlePolishScene}
            disabled={isPolishing || !editorContent.trim()}
            className="btn btn-primary btn-sm"
            style={{ padding: '0.45rem 1rem', gap: '0.45rem', flexShrink: 0 }}
            title="Mejorar y estilizar la redacción de la escena actual con IA"
          >
            {isPolishing ? (
              <>
                <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Mejorando...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
                <span>Mejorar Redacción</span>
              </>
            )}
          </button>
        </div>

        {polishFeedback && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '0.5rem 2rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={14} />
            <span>{polishFeedback}</span>
          </div>
        )}

        {/* Writing Canvas Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2.5rem 3.5rem',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{ width: '100%', maxWidth: '820px' }}>
            {/* Highlighted Entity Overlay View vs Raw Textarea */}
            {highlightEntities ? (
              <div 
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.15rem',
                  lineHeight: '1.85',
                  color: '#e2e8f0',
                  minHeight: '600px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {segmentTextWithHighlights(editorContent, entities).map((seg, idx) => {
                  if (seg.isEntity && seg.entity) {
                    return (
                      <span
                        key={idx}
                        className={`entity-highlight ${seg.entity.type}`}
                        onClick={() => setQuickEntity(seg.entity!)}
                        title={`Ver ficha de ${seg.entity.name} (${seg.entity.type})`}
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  return <span key={idx}>{seg.text}</span>;
                })}
              </div>
            ) : (
              <textarea
                className="writing-canvas"
                placeholder="Comienza a escribir esta escena... Las entidades del universo que menciones serán reconocidas automáticamente."
                value={editorContent}
                onChange={e => handleContentChange(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. COLUMNA DERECHA: Panel Contextual e Inteligencia Artificial           */}
      {/* ========================================================================= */}
      {!isZenMode && (
        <aside style={{
          width: '340px',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          {/* Header of Column 3 */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Sparkles size={16} style={{ color: 'var(--accent-indigo)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Contexto & Motor de IA
            </span>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* 3.0 PANEL DE REVISIÓN: PROPUESTA DE REDACCIÓN */}
            {polishProposal && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-indigo)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0e7ff' }}>
                      Propuesta de Redacción
                    </span>
                  </div>
                  <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.2)' }}>
                    IA Pulido
                  </span>
                </div>

                {polishProposal.toneInstruction && (
                  <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    Tono solicitado: "{polishProposal.toneInstruction}"
                  </p>
                )}

                {/* Previsualización del Texto Pulido */}
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'var(--bg-main)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.825rem',
                  lineHeight: '1.6',
                  color: '#f1f5f9',
                  fontFamily: 'var(--font-serif)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {polishProposal.improvedText}
                </div>

                {/* Stats de Palabras */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  padding: '0 0.2rem',
                }}>
                  <span>Original: {polishProposal.originalText.trim().split(/\s+/).length} pal.</span>
                  <span>→</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    Mejorado: {polishProposal.improvedText.trim().split(/\s+/).length} pal.
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleDiscardPolish}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '0.775rem' }}
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPolish}
                    className="btn btn-gold btn-sm"
                    style={{ flex: 1.3, fontSize: '0.775rem', gap: '0.35rem' }}
                  >
                    <Check size={14} />
                    <span>Aplicar Cambios</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3.1 MENCIONES ACTIVAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Menciones en esta Escena ({detectedMentions.length})
                </span>
                <Link 
                  href={`/workspace/${project.id}/lore`}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <span>Pestaña de Lore</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {detectedMentions.length === 0 ? (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                }}>
                  No se han detectado entidades del Lore en esta escena aún.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {detectedMentions.map(({ entity, count }) => (
                    <button
                      key={entity.id}
                      onClick={() => setQuickEntity(entity)}
                      className={`badge entity-tag-${entity.type}`}
                      style={{
                        cursor: 'pointer',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <span>{entity.name}</span>
                      <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>×{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

            {/* 3.2 MOTOR DE VERIFICACIÓN DE COHERENCIA */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Auditoría de Coherencia
                </span>
              </div>

              {/* Time-Travel Notice Banner */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.65rem',
                fontSize: '0.725rem',
                color: '#c7d2fe',
                lineHeight: '1.4',
                marginBottom: '0.75rem',
                display: 'flex',
                gap: '0.4rem'
              }}>
                <Clock size={14} style={{ flexShrink: 0, color: 'var(--accent-indigo)', marginTop: '2px' }} />
                <span>
                  <strong>Recorte Temporal Activo:</strong> Solo se evalúan los hitos ocurridos hasta esta escena. Los eventos de escenas posteriores se descartan estrictamente.
                </span>
              </div>

              {/* Filter Checkboxes */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={coherenceFilters.includes('location')}
                    onChange={() => toggleFilter('location')}
                  />
                  <span>Ubicación</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={coherenceFilters.includes('relationship')}
                    onChange={() => toggleFilter('relationship')}
                  />
                  <span>Relaciones</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={coherenceFilters.includes('possession')}
                    onChange={() => toggleFilter('possession')}
                  />
                  <span>Posesión / Objetos</span>
                </label>
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerifyCoherence}
                disabled={isAuditingCoherence || !editorContent.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.55rem', fontSize: '0.825rem' }}
              >
                {isAuditingCoherence ? (
                  <>
                    <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Auditando Canon...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Verificar Coherencia</span>
                  </>
                )}
              </button>

              {/* Coherence Audit Results */}
              {coherenceReport && (
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: coherenceReport.issues.length === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${coherenceReport.issues.length === 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
                    fontSize: '0.775rem',
                    marginBottom: '0.65rem',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: coherenceReport.issues.length === 0 ? '#6ee7b7' : '#fda4af' }}>
                      {coherenceReport.issues.length === 0 ? '✓ Escena Coherente con el Canon' : `⚠️ ${coherenceReport.issues.length} Inconsistencia(s) Detectada(s)`}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{coherenceReport.summary}</p>
                  </div>

                  {/* Issues List */}
                  {coherenceReport.issues.map(iss => (
                    <div key={iss.id} style={{
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '0.5rem',
                      fontSize: '0.775rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 600, color: iss.severity === 'error' ? '#fb7185' : '#fde047' }}>
                          {iss.title}
                        </span>
                        <span className="badge" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          {iss.category}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-primary)', marginBottom: '0.35rem', lineHeight: '1.35' }}>
                        <strong>Problema:</strong> {iss.issue}
                      </p>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem', lineHeight: '1.35' }}>
                        <strong>Explicación:</strong> {iss.explanation}
                      </p>
                      <p style={{ color: '#38bdf8', lineHeight: '1.35' }}>
                        <strong>Sugerencia:</strong> {iss.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

            {/* 3.3 ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Compass size={16} style={{ color: 'var(--accent-amber)' }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Actualizar Estados del Lore
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                La IA extrae los nuevos hitos ocurridos en esta escena (cambio de lugar, heridas, pérdida o adquisición de objetos).
              </p>

              <button
                onClick={handleUpdateStates}
                disabled={isUpdatingStates || !editorContent.trim()}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.55rem', fontSize: '0.825rem' }}
              >
                {isUpdatingStates ? (
                  <>
                    <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Extrayendo Nuevos Hitos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} style={{ color: 'var(--accent-amber)' }} />
                    <span>Escanear Nuevos Estados</span>
                  </>
                )}
              </button>

              {acceptedUpdatesCount > 0 && (
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.75rem',
                  color: '#6ee7b7',
                  textAlign: 'center'
                }}>
                  ✓ Se incorporaron {acceptedUpdatesCount} hito(s) al Lore de la historia.
                </div>
              )}

              {/* Proposed updates checklist */}
              {proposedUpdates.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Hitos Propuestos por la IA:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {proposedUpdates.map((up, i) => (
                      <label 
                        key={up.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-elevated)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={up.approved}
                          onChange={e => {
                            const copy = [...proposedUpdates];
                            copy[i].approved = e.target.checked;
                            setProposedUpdates(copy);
                          }}
                          style={{ marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{up.entityName}</strong>
                            <span className="badge" style={{ fontSize: '0.65rem' }}>{up.category}</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.3' }}>{up.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleAcceptUpdates}
                    className="btn btn-gold btn-sm"
                    style={{ width: '100%', marginTop: '0.6rem' }}
                  >
                    <Check size={14} />
                    <span>Aprobar e Incorporar al Lore</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* QUICK MODAL (VISTA RÁPIDA DE LA FICHA DE LORE)                            */}
      {/* ========================================================================= */}
      {quickEntity && (
        <div className="modal-overlay" onClick={() => setQuickEntity(null)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '520px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {quickEntity.image_url ? (
                  <img
                    src={quickEntity.image_url}
                    alt={quickEntity.name}
                    style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-medium)' }}
                    onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-indigo)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <FileText size={24} />
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span className={`badge entity-tag-${quickEntity.type}`} style={{ fontSize: '0.7rem' }}>
                      {quickEntity.type}
                    </span>
                    {quickEntity.role && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {quickEntity.role}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {quickEntity.name}
                  </h3>
                </div>
              </div>

              <button onClick={() => setQuickEntity(null)} className="btn btn-ghost btn-sm" style={{ borderRadius: '50%', padding: '0.35rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Entity Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {quickEntity.age_origin && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>EDAD / ORIGEN: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{quickEntity.age_origin}</span>
                </div>
              )}

              {quickEntity.appearance && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>APARIENCIA: </span>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>{quickEntity.appearance}</p>
                </div>
              )}

              {quickEntity.personality && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PERSONALIDAD: </span>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>{quickEntity.personality}</p>
                </div>
              )}

              {quickEntity.background && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TRASFONDO: </span>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>{quickEntity.background}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button onClick={() => setQuickEntity(null)} className="btn btn-secondary btn-sm">
                Cerrar
              </button>
              <Link 
                href={`/workspace/${project.id}/lore`}
                className="btn btn-primary btn-sm"
                style={{ gap: '0.4rem' }}
              >
                <span>Editar en Pestaña de Lore</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
