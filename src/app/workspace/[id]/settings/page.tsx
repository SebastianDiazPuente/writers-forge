'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { SettingsView } from '@/components/Settings/SettingsView';
import { getLocalProjects, DATA_UPDATED_EVENT } from '@/lib/storage';
import { Project } from '@/types';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);

  const refresh = () => {
    if (!projectId) return;
    const all = getLocalProjects();
    const found = all.find(p => p.id === projectId);
    setProject(found || null);
  };

  useEffect(() => {
    refresh();

    const handleDataUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.projectId || detail.projectId === projectId) {
        refresh();
      }
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [projectId]);

  return (
    <AppLayout currentProject={project} onRefresh={refresh}>
      <SettingsView project={project} onProjectUpdated={refresh} />
    </AppLayout>
  );
}
