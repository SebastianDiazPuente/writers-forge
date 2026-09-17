'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Sparkles, 
  Key, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Save, 
  Clock, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Project, AISettings, AIProvider } from '@/types';
import { 
  getLocalAISettings, 
  saveLocalAISettings, 
  exportProjectToJSON, 
  importProjectFromJSON 
} from '@/lib/storage';
import { supabase } from '@/lib/supabaseClient';
import { pushProjectToSupabase, pullProjectsFromSupabase } from '@/lib/syncService';
import { callLLM } from '@/lib/ai/client';

interface SettingsViewProps {
  project?: Project | null;
  onProjectUpdated?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ project, onProjectUpdated }) => {
  const [settings, setSettings] = useState<AISettings>(getLocalAISettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cloud Sync State
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [saveBanner, setSaveBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveLocalAISettings(settings);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  const handleTestAIConnection = async () => {
    const currentKey = settings.apiKeys?.[settings.provider]?.trim() || settings.apiKey?.trim();
    if (!currentKey) {
      setAiTestResult({
        success: false,
        message: `Por favor ingresa y guarda la API Key de ${settings.provider.toUpperCase()} antes de probar la conexión.`,
      });
      return;
    }

    setIsTestingAI(true);
    setAiTestResult(null);
    const start = performance.now();
    try {
      const response = await callLLM({
        userPrompt: 'Responde estrictamente con {"status": "ok", "message": "Conexión exitosa con IA"}',
        settings,
        modelType: 'fast',
        responseFormat: 'json',
      });
      const elapsed = Math.round(performance.now() - start);
      setAiTestResult({
        success: true,
        message: `¡Conexión exitosa! (${elapsed}ms) Proveedor ${settings.provider.toUpperCase()} listo.`,
      });
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: `Error al probar conexión: ${err.message}`,
      });
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleExportJSON = () => {
    if (!project) return;
    try {
      const jsonStr = exportProjectToJSON(project.id);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_lore_forge.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error al exportar: ' + err.message);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const imported = importProjectFromJSON(json);
        alert(`Proyecto "${imported.title}" importado exitosamente.`);
        if (onProjectUpdated) onProjectUpdated();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        alert('Error al importar archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handlePushSupabase = async () => {
    if (!user || !project) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await pushProjectToSupabase(project.id, user.id);
    setIsSyncing(false);
    setSyncFeedback(res);
  };

  const handlePullSupabase = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await pullProjectsFromSupabase(user.id);
    setIsSyncing(false);
    setSyncFeedback(res);
    if (onProjectUpdated) onProjectUpdated();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          Configuración & Preferencias
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configura tus proveedores de IA, respaldo en la nube con Supabase y preferencias de exportación de tu universo.
        </p>
      </div>

      {saveBanner && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#6ee7b7',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>Ajustes guardados correctamente en tu navegador.</span>
        </div>
      )}

      {/* 1. SECCIÓN: PROVEEDOR DE IA & FALLBACK MULTI-PLATAFORMA */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Sparkles size={20} style={{ color: 'var(--accent-indigo)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Servicios de Inteligencia Artificial & Resiliencia</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Configura tus claves de API para Gemini, OpenAI o Claude. Si un modelo falla o se deniega el acceso, el sistema aplicará fallback inteligente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings}>
          {/* Provider Selection (Default) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Proveedor de IA por Defecto</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Se priorizará para todas las tareas de redacción y coherencia
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((p) => {
                const isSelected = settings.provider === p;
                const hasKey = Boolean(settings.apiKeys?.[p]?.trim() || (settings.provider === p && settings.apiKey?.trim()));
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const newFast = p === 'gemini' ? 'gemini-2.5-flash' : p === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022';
                      const newReasoning = p === 'gemini' ? 'gemini-2.5-pro' : p === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022';
                      const currentKey = settings.apiKeys?.[p] || (settings.provider === p ? settings.apiKey : '');
                      const newSettings: AISettings = {
                        ...settings,
                        provider: p,
                        apiKey: currentKey,
                        fastModel: settings.models?.[p]?.fast || newFast,
                        reasoningModel: settings.models?.[p]?.reasoning || newReasoning,
                      };
                      setSettings(newSettings);
                      saveLocalAISettings(newSettings);
                    }}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ textTransform: 'capitalize', padding: '0.75rem', position: 'relative' }}
                  >
                    <Cpu size={15} />
                    <span>{p === 'gemini' ? 'Google Gemini' : p === 'openai' ? 'OpenAI' : 'Anthropic Claude'}</span>
                    {hasKey && (
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#34d399',
                        position: 'absolute',
                        top: '8px',
                        right: '8px'
                      }} title="API Key configurada" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual API Keys for Each Platform */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.6rem' }}>
              Claves de API por Plataforma (Almacenamiento Local Seguro)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Gemini Key */}
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: settings.provider === 'gemini' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                    Google AI Studio API Key {settings.provider === 'gemini' && '(Predeterminado)'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: settings.apiKeys?.gemini ? '#34d399' : 'var(--text-muted)' }}>
                    {settings.apiKeys?.gemini ? '✓ Activa' : 'Opcional (para fallback)'}
                  </span>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={settings.apiKeys?.gemini || ''}
                  onChange={e => {
                    const newKey = e.target.value;
                    const updatedKeys = { ...(settings.apiKeys || {}), gemini: newKey };
                    const updated = {
                      ...settings,
                      apiKeys: updatedKeys,
                      apiKey: settings.provider === 'gemini' ? newKey : settings.apiKey,
                    };
                    setSettings(updated);
                    saveLocalAISettings(updated);
                  }}
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* OpenAI Key */}
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: settings.provider === 'openai' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                    OpenAI API Key {settings.provider === 'openai' && '(Predeterminado)'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: settings.apiKeys?.openai ? '#34d399' : 'var(--text-muted)' }}>
                    {settings.apiKeys?.openai ? '✓ Activa' : 'Opcional (para fallback)'}
                  </span>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-proj-..."
                  value={settings.apiKeys?.openai || ''}
                  onChange={e => {
                    const newKey = e.target.value;
                    const updatedKeys = { ...(settings.apiKeys || {}), openai: newKey };
                    const updated = {
                      ...settings,
                      apiKeys: updatedKeys,
                      apiKey: settings.provider === 'openai' ? newKey : settings.apiKey,
                    };
                    setSettings(updated);
                    saveLocalAISettings(updated);
                  }}
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Anthropic Key */}
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: settings.provider === 'anthropic' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                    Anthropic Claude API Key {settings.provider === 'anthropic' && '(Predeterminado)'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: settings.apiKeys?.anthropic ? '#34d399' : 'var(--text-muted)' }}>
                    {settings.apiKeys?.anthropic ? '✓ Activa' : 'Opcional (para fallback)'}
                  </span>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  value={settings.apiKeys?.anthropic || ''}
                  onChange={e => {
                    const newKey = e.target.value;
                    const updatedKeys = { ...(settings.apiKeys || {}), anthropic: newKey };
                    const updated = {
                      ...settings,
                      apiKeys: updatedKeys,
                      apiKey: settings.provider === 'anthropic' ? newKey : settings.apiKey,
                    };
                    setSettings(updated);
                    saveLocalAISettings(updated);
                  }}
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showApiKey ? 'Ocultar claves' : 'Mostrar claves'}</span>
              </button>
            </div>
          </div>

          {/* Option: Use Only Fast Models (No Thinking / Pro) */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.07)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 1rem',
            marginBottom: '1.25rem',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.useOnlyFastModels)}
                onChange={e => {
                  const updated = { ...settings, useOnlyFastModels: e.target.checked };
                  setSettings(updated);
                  saveLocalAISettings(updated);
                }}
                style={{ marginTop: '3px' }}
              />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Usar solo modelos "Fast" o normales (sin versiones Pro ni Thinking)
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                  Omite el uso de modelos de razonamiento profundo o thinking de Gemini, OpenAI y Claude. Maximiza la velocidad de respuesta y reduce el consumo de cuota, utilizando siempre versiones ligeras y veloces (ej. gemini-2.5-flash, gpt-4o-mini, claude-3-5-haiku).
                </p>
              </div>
            </label>
          </div>

          {/* Models for Selected Provider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Modelo Rápido ({settings.provider.toUpperCase()})</label>
              <input
                type="text"
                value={settings.fastModel}
                onChange={e => {
                  const updated = { ...settings, fastModel: e.target.value };
                  setSettings(updated);
                  saveLocalAISettings(updated);
                }}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Autocompletado, sugerencias de Lore, estados y pulido de redacción.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Modelo Razonador ({settings.provider.toUpperCase()})</label>
              <input
                type="text"
                disabled={Boolean(settings.useOnlyFastModels)}
                value={settings.reasoningModel}
                onChange={e => {
                  const updated = { ...settings, reasoningModel: e.target.value };
                  setSettings(updated);
                  saveLocalAISettings(updated);
                }}
                className="form-input"
                style={{ fontSize: '0.85rem', opacity: settings.useOnlyFastModels ? 0.5 : 1 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {settings.useOnlyFastModels
                  ? 'Deshabilitado (se usa el modelo Rápido por la opción activa arriba).'
                  : 'Auditoría de coherencia narrativa y canon temporal.'}
              </span>
            </div>
          </div>

          {/* Test Connection Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleTestAIConnection}
              disabled={isTestingAI}
              className="btn btn-secondary"
            >
              {isTestingAI ? (
                <>
                  <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Probando Conexión...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
                  <span>Probar Conexión con IA ({settings.provider.toUpperCase()})</span>
                </>
              )}
            </button>

            <button type="submit" className="btn btn-gold">
              <Save size={15} />
              <span>Guardar Configuración de IA</span>
            </button>
          </div>
        </form>

        {/* AI Test Feedback */}
        {aiTestResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: aiTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${aiTestResult.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            fontSize: '0.825rem',
            color: aiTestResult.success ? '#6ee7b7' : '#fb7185',
          }}>
            {aiTestResult.message}
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: GESTIÓN DE DATOS Y RESPALDO EN SUPABASE */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Database size={20} style={{ color: 'var(--accent-emerald)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Respaldo en la Nube (Supabase)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sincroniza tus libros y lore para tener respaldo permanente y acceso multidispositivo.
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Estado de la Sesión:</span>
            <p style={{ fontSize: '0.8rem', color: user ? '#34d399' : 'var(--text-muted)', marginTop: '0.2rem' }}>
              {user ? `Conectado como ${user.email}` : 'Sesión no iniciada (Modo Offline-First activo)'}
            </p>
          </div>

          {user && (
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>

        {user ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handlePushSupabase}
              disabled={isSyncing || !project}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <Upload size={15} />
              <span>Subir Proyecto a Supabase</span>
            </button>

            <button
              onClick={handlePullSupabase}
              disabled={isSyncing}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Download size={15} />
              <span>Descargar Todo de Supabase</span>
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Inicia sesión desde el botón superior para habilitar el respaldo automático en la nube.
          </p>
        )}

        {syncFeedback && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: syncFeedback.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${syncFeedback.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            fontSize: '0.825rem',
            color: syncFeedback.success ? '#6ee7b7' : '#fb7185',
          }}>
            {syncFeedback.message}
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: EXPORTACIÓN / IMPORTACIÓN MANUAL EN FORMATO JSON */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Download size={20} style={{ color: 'var(--accent-gold)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Exportar / Importar Universo (JSON)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Exporta tu novela completa con capítulos, escenas, lore e hitos en un archivo .json estándar, sin necesidad de conexión.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportJSON}
          />

          <button
            onClick={handleExportJSON}
            disabled={!project}
            className="btn btn-gold"
          >
            <Download size={16} />
            <span>Exportar Proyecto Actual a .JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
          >
            <Upload size={16} />
            <span>Importar Archivo .JSON</span>
          </button>
        </div>
      </div>

      {/* 4. SECCIÓN: PREFERENCIAS DE AUTOGUARDADO */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Clock size={20} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Preferencias de Autoguardado</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Ajusta con qué frecuencia se registra el contenido en el almacenamiento local de tu navegador.
            </p>
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label className="form-label">Frecuencia de Autoguardado</label>
          <select
            value={settings.autosaveInterval}
            onChange={e => {
              const updated = { ...settings, autosaveInterval: parseInt(e.target.value) };
              setSettings(updated);
              saveLocalAISettings(updated);
            }}
            className="form-select"
          >
            <option value={10}>Cada 10 segundos (Rápido)</option>
            <option value={30}>Cada 30 segundos (Recomendado)</option>
            <option value={60}>Cada 60 segundos</option>
            <option value={0}>Solo manual</option>
          </select>
        </div>
      </div>
    </div>
  );
};
