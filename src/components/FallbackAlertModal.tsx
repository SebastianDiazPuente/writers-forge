'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { AIFallbackEventDetail, AIProvider } from '@/types';
import { getLocalAISettings, saveLocalAISettings } from '@/lib/storage';

export const FallbackAlertModal: React.FC = () => {
  const [fallbackData, setFallbackData] = useState<AIFallbackEventDetail | null>(null);

  useEffect(() => {
    const handleFallback = (e: Event) => {
      const customEvent = e as CustomEvent<AIFallbackEventDetail>;
      if (customEvent.detail) {
        setFallbackData(customEvent.detail);
      }
    };

    window.addEventListener('wf_ai_fallback_triggered', handleFallback);
    return () => {
      window.removeEventListener('wf_ai_fallback_triggered', handleFallback);
    };
  }, []);

  if (!fallbackData) return null;

  const handleSetAsDefault = () => {
    const current = getLocalAISettings();
    const updated = {
      ...current,
      provider: fallbackData.fallbackProvider,
    };
    if (fallbackData.fallbackModel.includes('flash') || fallbackData.fallbackModel.includes('mini') || fallbackData.fallbackModel.includes('haiku')) {
      updated.fastModel = fallbackData.fallbackModel;
    } else {
      updated.reasoningModel = fallbackData.fallbackModel;
    }
    saveLocalAISettings(updated);
    setFallbackData(null);
  };

  const handleDismiss = () => {
    setFallbackData(null);
  };

  return (
    <div className="modal-overlay" onClick={handleDismiss} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '540px', padding: '1.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(251, 191, 36, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Aviso de Modelo Alternativo (Fallback)
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Se aplicó una alternativa para completar tu solicitud con éxito
              </p>
            </div>
          </div>

          <button onClick={handleDismiss} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          lineHeight: '1.5',
        }}>
          <p style={{ marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
            El modelo principal configurado (
            <strong style={{ color: '#fb7185' }}>
              {fallbackData.originalProvider.toUpperCase()} / {fallbackData.originalModel}
            </strong>
            ) no pudo responder.
          </p>

          <p style={{
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem',
            wordBreak: 'break-word',
          }}>
            <strong>Motivo:</strong> {fallbackData.reason}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem' }}>
            <Check size={16} />
            <span>
              Respuesta generada con éxito usando:{' '}
              <strong>
                {fallbackData.fallbackProvider.toUpperCase()} ({fallbackData.fallbackModel})
              </strong>
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          ¿Deseas establecer <strong>{fallbackData.fallbackProvider.toUpperCase()} ({fallbackData.fallbackModel})</strong> como tu modelo por defecto a partir de ahora para evitar futuros retrasos?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleDismiss}
            className="btn btn-secondary btn-sm"
          >
            Usar solo esta vez (Mantener actual)
          </button>
          <button
            type="button"
            onClick={handleSetAsDefault}
            className="btn btn-gold btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <Sparkles size={14} />
            <span>Establecer como Por Defecto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
