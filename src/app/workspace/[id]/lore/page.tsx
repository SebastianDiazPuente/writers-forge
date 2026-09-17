'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { LoreGallery } from '@/components/Lore/LoreGallery';
import { getLocalProjects, DATA_UPDATED_EVENT } from '@/lib/storage';
import { Project } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectLorePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProject = () => {
    if (!projectId) return;
    const all = getLocalProjects();
    const found = all.find(p => p.id === projectId);
    setProject(found || null);
    setLoading(false);
  };

  useEffect(() => {
    refreshProject();

    const handleDataUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.projectId || detail.projectId === projectId) {
        refreshProject();
      }
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [projectId]);

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p style={{ color: 'var(--text-muted)' }}>Cargando enciclopedia de Lore...</p>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div style={{ maxWidth: '500px', margin: '5rem auto', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Proyecto no encontrado</h2>
          <Link href="/projects" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Volver a la Biblioteca</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentProject={project}>
      <LoreGallery project={project} />
    </AppLayout>
  );
}
