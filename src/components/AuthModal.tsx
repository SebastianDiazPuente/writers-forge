'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Mail, Lock, Shield, Sparkles, Cloud, WifiOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setSuccessMsg('¡Cuenta creada! Revisa tu correo electrónico para confirmar tu registro.');
        } else {
          setSuccessMsg('¡Registro exitoso! Sesión iniciada.');
          if (onAuthSuccess) onAuthSuccess();
          setTimeout(onClose, 1200);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('¡Sesión iniciada con éxito!');
        if (onAuthSuccess) onAuthSuccess();
        setTimeout(onClose, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al autenticar. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/projects` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google OAuth.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '440px', padding: '2rem' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Cloud size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Respaldo en la nube con Supabase
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Offline-First Reminder Banner */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8rem',
          lineHeight: '1.4',
          color: '#c7d2fe',
          display: 'flex',
          gap: '0.6rem'
        }}>
          <Shield size={18} style={{ flexShrink: 0, color: 'var(--accent-indigo)' }} />
          <span>
            <strong>Offline-First:</strong> Puedes usar todas las funciones sin cuenta. Iniciar sesión te permite sincronizar tus libros con la nube de Supabase.
          </span>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.9rem',
            marginBottom: '1rem',
            fontSize: '0.825rem',
            color: '#fb7185'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.9rem',
            marginBottom: '1rem',
            fontSize: '0.825rem',
            color: '#6ee7b7'
          }}>
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail 
                size={16} 
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock 
                size={16} 
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.7rem' }}
          >
            {loading ? 'Procesando...' : isSignUp ? 'Registrarse en Supabase' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O CONTINUAR CON</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleOAuthGoogle}
          disabled={loading}
          className="btn btn-secondary"
          style={{ width: '100%', gap: '0.6rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Google OAuth</span>
        </button>

        {/* Offline Mode Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
        >
          <WifiOff size={15} />
          <span>Continuar sin cuenta (Modo Offline)</span>
        </button>

        {/* Toggle between SignUp & SignIn */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta todavía?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-indigo)',
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Inicia sesión' : 'Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};
