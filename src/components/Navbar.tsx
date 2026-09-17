'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  Feather, 
  Database, 
  Sparkles, 
  Settings, 
  LogOut, 
  LogIn, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { pushProjectToSupabase, pullProjectsFromSupabase } from '@/lib/syncService';
import { Project } from '@/types';

interface NavbarProps {
  currentProject?: Project | null;
  onOpenAuthModal?: () => void;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentProject, 
  onOpenAuthModal,
  onRefresh 
}) => {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!currentProject) {
      // Pull all projects from cloud
      setIsSyncing(true);
      const res = await pullProjectsFromSupabase(user.id);
      setIsSyncing(false);
      setStatusMsg(res.message);
      setSyncStatus(res.success ? 'success' : 'error');
      if (onRefresh) onRefresh();
      setTimeout(() => setSyncStatus('idle'), 4000);
      return;
    }

    // Push active project to cloud
    setIsSyncing(true);
    const res = await pushProjectToSupabase(currentProject.id, user.id);
    setIsSyncing(false);
    setStatusMsg(res.message);
    setSyncStatus(res.success ? 'success' : 'error');
    setTimeout(() => setSyncStatus('idle'), 4000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <header style={{
      height: '60px',
      background: 'rgba(14, 18, 27, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link 
          href="/projects" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            textDecoration: 'none',
            color: 'var(--text-primary)'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #d4af37 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
          }}>
            <Feather size={18} />
          </div>
          <span style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            letterSpacing: '0.02em',
            background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            WRITER'S FORGE
          </span>
        </Link>

        {currentProject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)' }}>
            <span>/</span>
            <Link 
              href={`/workspace/${currentProject.id}`}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <BookOpen size={15} style={{ color: 'var(--accent-amber)' }} />
              <span>{currentProject.title}</span>
            </Link>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
              {currentProject.word_count.toLocaleString()} palabras
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link 
          href="/projects" 
          className={`btn ${pathname === '/projects' ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontSize: '0.825rem', padding: '0.45rem 0.8rem' }}
        >
          <FolderOpen size={16} />
          <span>Proyectos</span>
        </Link>

        {currentProject && (
          <>
            <Link 
              href={`/workspace/${currentProject.id}`} 
              className={`btn ${pathname?.startsWith('/workspace') && !pathname?.includes('/lore') ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.8rem' }}
            >
              <Feather size={16} />
              <span>Editor</span>
            </Link>
            <Link 
              href={`/workspace/${currentProject.id}/lore`} 
              className={`btn ${pathname?.includes('/lore') ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.8rem' }}
            >
              <Sparkles size={16} style={{ color: 'var(--accent-indigo)' }} />
              <span>Lore & Fichas</span>
            </Link>
          </>
        )}

        <Link 
          href={currentProject ? `/workspace/${currentProject.id}/settings` : '/settings'} 
          className={`btn ${pathname?.includes('/settings') ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontSize: '0.825rem', padding: '0.45rem 0.8rem' }}
        >
          <Settings size={16} />
          <span>Configuración</span>
        </Link>
      </nav>

      {/* Auth & Sync Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Offline / Cloud Status Pill */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-ghost btn-sm"
          title={user ? (currentProject ? 'Sincronizar proyecto con Supabase' : 'Descargar proyectos de Supabase') : 'Modo Offline (Inicia sesión para sincronizar)'}
          style={{
            background: user ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${user ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
            color: user ? '#34d399' : 'var(--text-secondary)',
            fontSize: '0.775rem'
          }}
        >
          {isSyncing ? (
            <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          ) : user ? (
            <Wifi size={13} />
          ) : (
            <WifiOff size={13} />
          )}
          <span>{user ? (isSyncing ? 'Sincronizando...' : 'Nube Activa') : 'Modo Offline'}</span>
        </button>

        {/* User Account / Login */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user.email?.split('@')[0]}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              title="Cerrar sesión"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="btn btn-primary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <LogIn size={14} />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};
