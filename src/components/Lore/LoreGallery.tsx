'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Trash2, 
  Edit3, 
  User, 
  MapPin, 
  Shield, 
  Compass, 
  Tag, 
  X, 
  Clock, 
  Check, 
  AlertCircle, 
  Image as ImageIcon,
  RefreshCw,
  Box
} from 'lucide-react';
import { Project, Entity, EntityType, EntityMilestone, MilestoneCategory } from '@/types';
import { 
  getLocalEntities, 
  getLocalMilestones, 
  getLocalScenes, 
  saveLocalEntity, 
  deleteLocalEntity, 
  saveLocalMilestone, 
  deleteLocalMilestone,
  getLocalAISettings,
  DATA_UPDATED_EVENT 
} from '@/lib/storage';
import { buildLoreSuggestionPrompt } from '@/lib/ai/prompts';
import { callLLM } from '@/lib/ai/client';

interface LoreGalleryProps {
  project: Project;
}

export const LoreGallery: React.FC<LoreGalleryProps> = ({ project }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [milestones, setMilestones] = useState<EntityMilestone[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);

  // Filter & Search state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<EntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Edit / Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Partial<Entity> | null>(null);
  const [entityMilestones, setEntityMilestones] = useState<EntityMilestone[]>([]);
  
  // New Milestone Form inside Modal
  const [newMilestoneCategory, setNewMilestoneCategory] = useState<MilestoneCategory>('location');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneSceneId, setNewMilestoneSceneId] = useState<string>('');

  // AI Suggestion state
  const [isSuggestingWithAI, setIsSuggestingWithAI] = useState(false);

  const refreshLore = () => {
    const entList = getLocalEntities(project.id);
    const msList = getLocalMilestones(project.id);
    const scList = getLocalScenes(project.id);
    setEntities(entList);
    setMilestones(msList);
    setScenes(scList);
  };

  useEffect(() => {
    refreshLore();

    const handleDataUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.projectId || detail.projectId === project.id) {
        refreshLore();
      }
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [project.id]);

  // All distinct tags
  const allTags = Array.from(new Set(entities.flatMap(e => e.tags || [])));

  // Filtered entities
  const filteredEntities = entities.filter(e => {
    if (selectedTypeFilter !== 'all' && e.type !== selectedTypeFilter) return false;
    if (selectedTagFilter && (!e.tags || !e.tags.includes(selectedTagFilter))) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = e.name.toLowerCase().includes(q);
      const matchAlias = (e.aliases || []).some(a => a.toLowerCase().includes(q));
      const matchRole = (e.role || '').toLowerCase().includes(q);
      const matchBackground = (e.background || '').toLowerCase().includes(q);
      return matchName || matchAlias || matchRole || matchBackground;
    }
    return true;
  });

  const handleOpenCreate = (type: EntityType = 'character') => {
    setEditingEntity({
      id: 'ent-' + Math.random().toString(36).substring(2, 9),
      project_id: project.id,
      type,
      name: '',
      aliases: [],
      image_url: '',
      age_origin: '',
      appearance: '',
      personality: '',
      background: '',
      role: '',
      tags: [],
    });
    setEntityMilestones([]);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (entity: Entity) => {
    setEditingEntity({ ...entity });
    const associatedMs = milestones.filter(m => m.entity_id === entity.id);
    setEntityMilestones(associatedMs);
    setIsEditModalOpen(true);
  };

  const handleDeleteEntity = (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta ficha de Lore y todos sus hitos temporales?')) {
      deleteLocalEntity(entityId);
      refreshLore();
    }
  };

  const handleSaveEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity || !editingEntity.name?.trim()) return;

    const finalEntity: Entity = {
      id: editingEntity.id || 'ent-' + Math.random().toString(36).substring(2, 9),
      project_id: project.id,
      type: editingEntity.type || 'character',
      name: editingEntity.name.trim(),
      aliases: editingEntity.aliases || [],
      image_url: editingEntity.image_url?.trim() || undefined,
      age_origin: editingEntity.age_origin?.trim() || undefined,
      appearance: editingEntity.appearance?.trim() || undefined,
      personality: editingEntity.personality?.trim() || undefined,
      background: editingEntity.background?.trim() || undefined,
      role: editingEntity.role?.trim() || undefined,
      tags: editingEntity.tags || [],
      created_at: editingEntity.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalEntity(finalEntity);
    setIsEditModalOpen(false);
    setEditingEntity(null);
    refreshLore();
  };

  // Add new milestone manually
  const handleAddMilestone = () => {
    if (!editingEntity?.id || !newMilestoneDesc.trim()) return;
    const newMs: EntityMilestone = {
      id: 'm-' + Math.random().toString(36).substring(2, 9),
      entity_id: editingEntity.id,
      project_id: project.id,
      scene_id: newMilestoneSceneId || undefined,
      category: newMilestoneCategory,
      description: newMilestoneDesc.trim(),
      order_index: entityMilestones.length,
      created_at: new Date().toISOString(),
    };
    saveLocalMilestone(newMs);
    setEntityMilestones([...entityMilestones, newMs]);
    setNewMilestoneDesc('');
    setNewMilestoneSceneId('');
    refreshLore();
  };

  // Delete milestone
  const handleDeleteMilestone = (milestoneId: string) => {
    deleteLocalMilestone(milestoneId);
    setEntityMilestones(entityMilestones.filter(m => m.id !== milestoneId));
    refreshLore();
  };

  // ASISTENTE DE RELLENO CON IA
  const handleSuggestWithAI = async () => {
    if (!editingEntity) return;
    setIsSuggestingWithAI(true);
    try {
      const prompt = buildLoreSuggestionPrompt(editingEntity, project.synopsis, project.genre);
      const aiSettings = getLocalAISettings();
      const raw = await callLLM({
        userPrompt: prompt,
        settings: aiSettings,
        modelType: 'fast',
        responseFormat: 'json',
      });

      const parsed = JSON.parse(raw);
      setEditingEntity(prev => ({
        ...prev,
        appearance: prev?.appearance || parsed.appearance || '',
        personality: prev?.personality || parsed.personality || '',
        background: prev?.background || parsed.background || '',
        role: prev?.role || parsed.role || '',
        tags: Array.from(new Set([...(prev?.tags || []), ...(parsed.suggested_tags || [])])),
      }));
    } catch (err: any) {
      console.error('Error suggesting lore:', err);
      alert('Error al sugerir con IA: ' + err.message);
    } finally {
      setIsSuggestingWithAI(false);
    }
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'character': return <User size={15} />;
      case 'faction': return <Shield size={15} />;
      case 'location': return <MapPin size={15} />;
      case 'item': return <Box size={15} />;
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge" style={{ background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', marginBottom: '0.6rem' }}>
            <Sparkles size={13} /> Enciclopedia & Lore Dinámico
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Galería del Universo: {project.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px' }}>
            Gestiona personajes, facciones, lugares y artefactos. Registra sus hitos cronológicos para que el motor de IA audite la coherencia sin spoilers temporales.
          </p>
        </div>

        {/* Action Button */}
        <button onClick={() => handleOpenCreate('character')} className="btn btn-gold">
          <Plus size={18} />
          <span>+ Nueva Ficha de Lore</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Entity Type Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-surface)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`btn btn-sm ${selectedTypeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Todos ({entities.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('character')}
              className={`btn btn-sm ${selectedTypeFilter === 'character' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: selectedTypeFilter === 'character' ? '#fff' : 'var(--entity-character)' }}
            >
              <User size={13} /> Personajes
            </button>
            <button
              onClick={() => setSelectedTypeFilter('faction')}
              className={`btn btn-sm ${selectedTypeFilter === 'faction' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: selectedTypeFilter === 'faction' ? '#fff' : 'var(--entity-faction)' }}
            >
              <Shield size={13} /> Facciones
            </button>
            <button
              onClick={() => setSelectedTypeFilter('location')}
              className={`btn btn-sm ${selectedTypeFilter === 'location' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: selectedTypeFilter === 'location' ? '#fff' : 'var(--entity-location)' }}
            >
              <MapPin size={13} /> Lugares
            </button>
            <button
              onClick={() => setSelectedTypeFilter('item')}
              className={`btn btn-sm ${selectedTypeFilter === 'item' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: selectedTypeFilter === 'item' ? '#fff' : 'var(--entity-item)' }}
            >
              <Box size={13} /> Objetos Clave
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Buscar en el Lore..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Tag Filters (if any exist) */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Tag size={12} /> Etiquetas:
            </span>
            {allTags.map(tag => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                  className="badge"
                  style={{
                    background: isSelected ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedTagFilter && (
              <button
                onClick={() => setSelectedTagFilter(null)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
              >
                Limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Lore Cards */}
      {filteredEntities.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No se encontraron fichas de Lore con los filtros actuales.
          </p>
          <button onClick={() => handleOpenCreate('character')} className="btn btn-primary">
            <Plus size={16} /> Crear Nueva Ficha
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {filteredEntities.map(entity => {
            const entMilestones = milestones.filter(m => m.entity_id === entity.id);
            const latestMilestone = entMilestones[entMilestones.length - 1];

            return (
              <div
                key={entity.id}
                className="glass-panel"
                onClick={() => handleOpenEdit(entity)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--border-bright)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                {/* Header / Image banner if available */}
                <div style={{
                  height: entity.image_url ? '120px' : '65px',
                  background: entity.image_url ? 'none' : 'linear-gradient(135deg, #181c28 0%, #12151e 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  {entity.image_url && (
                    <img
                      src={entity.image_url}
                      alt={entity.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }}
                      onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  )}

                  {/* Badge top-left */}
                  <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem' }}>
                    <span className={`badge entity-tag-${entity.type}`} style={{ fontSize: '0.725rem' }}>
                      {getEntityIcon(entity.type)}
                      <span>{entity.type.toUpperCase()}</span>
                    </span>
                  </div>

                  {/* Delete button top-right */}
                  <button
                    onClick={e => handleDeleteEntity(entity.id, e)}
                    className="btn btn-ghost btn-sm"
                    title="Eliminar ficha"
                    style={{
                      position: 'absolute',
                      top: '0.6rem',
                      right: '0.6rem',
                      background: 'rgba(15, 23, 42, 0.75)',
                      padding: '0.35rem',
                      borderRadius: '50%',
                    }}
                  >
                    <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.2rem' }}>
                      {entity.name}
                    </h3>
                    {entity.role && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 500 }}>
                        {entity.role}
                      </p>
                    )}
                  </div>

                  {/* Aliases */}
                  {entity.aliases && entity.aliases.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                      Alias: {entity.aliases.join(', ')}
                    </p>
                  )}

                  {/* Short description */}
                  <p style={{
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.45',
                    marginBottom: '0.85rem',
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {entity.appearance || entity.background || entity.personality || 'Sin descripción detallada.'}
                  </p>

                  {/* Latest Milestone Indicator */}
                  {latestMilestone ? (
                    <div style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.18)',
                      fontSize: '0.75rem',
                      marginBottom: '0.75rem',
                      lineHeight: '1.35',
                    }}>
                      <span style={{ color: 'var(--accent-indigo)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                        Último Hito ({latestMilestone.category}):
                      </span>
                      <p style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                        {latestMilestone.description}
                      </p>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Sin hitos cronológicos registrados.
                    </div>
                  )}

                  {/* Tags */}
                  {entity.tags && entity.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: 'auto' }}>
                      {entity.tags.map(t => (
                        <span key={t} className="badge" style={{ background: 'rgba(255, 255, 255, 0.04)', fontSize: '0.68rem' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT / CREATE ENTITY MODAL (FICHA COMPLETA CON LÍNEA TEMPORAL)           */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingEntity && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '780px', padding: '2rem' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)'
                }}>
                  {getEntityIcon(editingEntity.type || 'character')}
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {editingEntity.name ? `Editar: ${editingEntity.name}` : '+ Nueva Ficha de Lore'}
                </h2>
              </div>

              {/* Botón Sugerir con IA */}
              <button
                type="button"
                onClick={handleSuggestWithAI}
                disabled={isSuggestingWithAI}
                className="btn btn-primary btn-sm"
              >
                {isSuggestingWithAI ? (
                  <>
                    <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Sugerir con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Sugerir con IA</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSaveEntity}>
              {/* Row 1: Name, Type, Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editingEntity.name || ''}
                    onChange={e => setEditingEntity({ ...editingEntity, name: e.target.value })}
                    placeholder="Ej. Eldrin el Mago, Espada de Luz..."
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Entidad</label>
                  <select
                    value={editingEntity.type || 'character'}
                    onChange={e => setEditingEntity({ ...editingEntity, type: e.target.value as EntityType })}
                    className="form-select"
                  >
                    <option value="character">Personaje</option>
                    <option value="faction">Facción</option>
                    <option value="location">Lugar</option>
                    <option value="item">Objeto Clave</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol Narrativo</label>
                  <input
                    type="text"
                    value={editingEntity.role || ''}
                    onChange={e => setEditingEntity({ ...editingEntity, role: e.target.value })}
                    placeholder="Protagonista, Guía, Reliquia..."
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 2: Aliases, Image URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                    <label className="form-label">Alias (separados por coma)</label>
                    <input
                      type="text"
                      pattern="^[^,]+(,\s*[^,]+)*$"
                      title="Ingrese alias(s) separados por comas"
                      value={(editingEntity.aliases || []).join(', ')}
                      onChange={e => setEditingEntity({
                        ...editingEntity,
                        aliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Ej. Eldrin, Maestro Eldrin, El Desterrado"
                      className="form-input"
                    />
                </div>

                <div className="form-group">
                  <label className="form-label">URL de Imagen Web (Opcional - JPG/PNG/WEBM)</label>
                  <input
                    type="url"
                    value={editingEntity.image_url || ''}
                    onChange={e => setEditingEntity({ ...editingEntity, image_url: e.target.value })}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 3: Age/Origin, Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Edad / Origen</label>
                  <input
                    type="text"
                    value={editingEntity.age_origin || ''}
                    onChange={e => setEditingEntity({ ...editingEntity, age_origin: e.target.value })}
                    placeholder="Ej. 35 años, nacido en las montañas..."
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                    <label className="form-label">Etiquetas (separadas por coma)</label>
                    <input
                      type="text"
                      pattern="^[^,]+(,\s*[^,]+)*$"
                      title="Ingrese etiqueta(s) separadas por comas"
                      value={(editingEntity.tags || []).join(', ')}
                      onChange={e => setEditingEntity({
                        ...editingEntity,
                        tags: e.target.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean)
                      })}
                      placeholder="mago, secreto, traidor..."
                      className="form-input"
                    />
                </div>
              </div>

              {/* Descriptions */}
              <div className="form-group">
                <label className="form-label">Apariencia Física / Rasgos Distintivos</label>
                <textarea
                  value={editingEntity.appearance || ''}
                  onChange={e => setEditingEntity({ ...editingEntity, appearance: e.target.value })}
                  placeholder="Detalles visuales perceptibles..."
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Personalidad y Motivaciones</label>
                <textarea
                  value={editingEntity.personality || ''}
                  onChange={e => setEditingEntity({ ...editingEntity, personality: e.target.value })}
                  placeholder="Temperamento, miedos, contradicciones..."
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trasfondo e Historia</label>
                <textarea
                  value={editingEntity.background || ''}
                  onChange={e => setEditingEntity({ ...editingEntity, background: e.target.value })}
                  placeholder="Pasado de la entidad en el universo..."
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                />
              </div>

              {/* ========================================================= */}
              {/* LÍNEA DE ESTADO / HISTORIAL TEMPORAL DE HITOS             */}
              {/* ========================================================= */}
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Clock size={16} style={{ color: 'var(--accent-indigo)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    Línea de Estado / Historial Temporal
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Hitos cronológicos organizados por Ubicación, Relaciones y Posesión. Estos hitos alimentan el motor de recorte temporal de la IA.
                </p>

                {/* Existing Milestones List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {entityMilestones.length === 0 ? (
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No hay hitos temporales registrados para esta entidad aún.
                    </div>
                  ) : (
                    entityMilestones.map(m => {
                      const sceneTitle = scenes.find(s => s.id === m.scene_id)?.title;
                      return (
                        <div key={m.id} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.8rem',
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <span className="badge" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                {m.category}
                              </span>
                              {sceneTitle && (
                                <span style={{ color: 'var(--accent-amber)', fontSize: '0.7rem' }}>
                                  [En: {sceneTitle}]
                                </span>
                              )}
                            </div>
                            <p style={{ color: 'var(--text-primary)', lineHeight: '1.35' }}>
                              {m.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="btn btn-ghost btn-sm"
                            title="Eliminar este hito"
                            style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Milestone Sub-form */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-medium)',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    + Registrar Nuevo Hito
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <select
                      value={newMilestoneCategory}
                      onChange={e => setNewMilestoneCategory(e.target.value as MilestoneCategory)}
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    >
                      <option value="location">Ubicación / Posición Física</option>
                      <option value="relationship">Relación / Alianza</option>
                      <option value="possession">Posesión / Condición de Objeto</option>
                      <option value="other">Otro Hito General</option>
                    </select>

                    <select
                      value={newMilestoneSceneId}
                      onChange={e => setNewMilestoneSceneId(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    >
                      <option value="">-- Sin escena vinculada (Pre-historia) --</option>
                      {scenes.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Descripción del hito (ej. Arriba a la Posada del Cuervo herido de gravedad)..."
                    value={newMilestoneDesc}
                    onChange={e => setNewMilestoneDesc(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', marginBottom: '0.5rem' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      disabled={!newMilestoneDesc.trim()}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={13} />
                      <span>Añadir Hito</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold">
                  <Check size={16} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
