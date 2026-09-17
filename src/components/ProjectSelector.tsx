'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  BookOpen, 
  Trash2, 
  Edit3, 
  FileUp, 
  Calendar, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { Project } from '@/types';
import { 
  getLocalProjects, 
  saveLocalProject, 
  deleteLocalProject, 
  importProjectFromJSON,
  setLastActiveProjectId,
  DATA_UPDATED_EVENT 
} from '@/lib/storage';

export const ProjectSelector: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // New Project Form State
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = () => {
    const list = getLocalProjects();
    setProjects(list);
  };

  useEffect(() => {
    loadProjects();

    const handleDataUpdated = () => {
      loadProjects();
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, []);

  const handleOpenProject = (projectId: string) => {
    setLastActiveProjectId(projectId);
    router.push(`/workspace/${projectId}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newProject: Project = {
      id: 'proj-' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      genre: genre.trim() || undefined,
      synopsis: synopsis.trim() || undefined,
      cover_url: coverUrl.trim() || undefined,
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalProject(newProject);
    setTitle('');
    setGenre('');
    setSynopsis('');
    setCoverUrl('');
    setIsCreateModalOpen(false);
    loadProjects();
    handleOpenProject(newProject.id);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    deleteLocalProject(projectToDelete.id);
    setProjectToDelete(null);
    setIsDeleteModalOpen(false);
    loadProjects();
    showNotification('Proyecto eliminado de la biblioteca', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importProjectFromJSON(content);
        loadProjects();
        showNotification(`Proyecto "${imported.title}" importado con éxito`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        showNotification(`Error al importar archivo: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Reciente';
    try {
      return new Date(isoString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 200,
          background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          backdropFilter: 'blur(8px)',
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <span className="badge" style={{ 
            background: 'var(--accent-indigo-glow)', 
            color: 'var(--accent-indigo)', 
            marginBottom: '0.75rem',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Sparkles size={13} /> Asistente Literario Modular
          </span>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '2.2rem', 
            fontWeight: 700,
            letterSpacing: '0.02em',
            marginBottom: '0.5rem'
          }}>
            Tus Historias & Universos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px' }}>
            Selecciona un proyecto para abrir su Workspace, redactar escenas con detección de entidades en tiempo real y verificar la coherencia temporal de tu universo.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Hidden File Input for JSON import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportJSON}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            title="Importar archivo JSON con libro y lore"
          >
            <FileUp size={16} />
            <span>Importar JSON</span>
          </button>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-gold"
          >
            <Plus size={18} />
            <span>+ Crear Nuevo Libro</span>
          </button>
        </div>
      </div>

      {/* Grid of Projects */}
      {projects.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No tienes proyectos activos aún</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            Crea tu primer libro o importa un archivo JSON para comenzar a escribir con el asistente de coherencia.
          </p>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Crear Mi Primer Libro</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}>
          {projects.map((proj) => (
            <div 
              key={proj.id}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all var(--transition-normal)',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => handleOpenProject(proj.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--border-bright)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {/* Cover Banner (URL image or gradient fallback) */}
              <div style={{
                height: '150px',
                width: '100%',
                position: 'relative',
                background: proj.cover_url ? 'none' : 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
                overflow: 'hidden',
              }}>
                {proj.cover_url ? (
                  <img
                    src={proj.cover_url}
                    alt={proj.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.85)',
                      transition: 'transform 0.4s ease',
                    }}
                    onError={(e) => {
                      // fallback if image link fails
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    textAlign: 'center',
                  }}>
                    <BookOpen size={40} style={{ color: 'rgba(212, 175, 55, 0.4)' }} />
                  </div>
                )}

                {/* Genre Tag Overlay */}
                {proj.genre && (
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                  }}>
                    <span className="badge" style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(8px)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                    }}>
                      {proj.genre}
                    </span>
                  </div>
                )}

                {/* Delete button top right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(proj);
                    setIsDeleteModalOpen(true);
                  }}
                  className="btn btn-ghost btn-sm"
                  title="Eliminar proyecto"
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(6px)',
                    color: 'var(--text-muted)',
                    borderRadius: '50%',
                    padding: '0.4rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fb7185')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Body Content */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                }}>
                  {proj.title}
                </h3>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  marginBottom: '1.25rem',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {proj.synopsis || 'Sin sinopsis definida todavía.'}
                </p>

                {/* Card Footer Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={13} style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {proj.word_count.toLocaleString()}
                    </span>{' '}
                    palabras
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} />
                    <span>{formatDate(proj.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ padding: '2rem' }}
          >
            <h2 style={{ 
              fontSize: '1.35rem', 
              fontWeight: 700, 
              fontFamily: 'var(--font-display)', 
              marginBottom: '0.4rem' 
            }}>
              + Crear Nuevo Libro / Proyecto
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Define los datos principales de tu historia. Las carátulas e imágenes son totalmente opcionales.
            </p>

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Título del Libro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Las Nieblas de Avalon, Crónicas de..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Género Literario</label>
                <input
                  type="text"
                  placeholder="Ej. Fantasía Oscura, Ciencia Ficción, Novela Histórica"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sinopsis Corta o Premisa Argumental</label>
                <textarea
                  placeholder="Describe en pocas oraciones el conflicto central, el protagonista y la atmósfera..."
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ImageIcon size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>URL de Carátula Web (Opcional - JPG, PNG o WebM/WebP)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/portada.jpg"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Solo se guardará la URL web, sin consumir almacenamiento en la nube.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold">
                  <Sparkles size={16} />
                  <span>Crear y Abrir Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && projectToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                ¿Eliminar este proyecto?
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Estás a punto de eliminar <strong>"{projectToDelete.title}"</strong> junto con todos sus capítulos, escenas, fichas de Lore e hitos temporales. Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                <span>Sí, Eliminar Proyecto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
