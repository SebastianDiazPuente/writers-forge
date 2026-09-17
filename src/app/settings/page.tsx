'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { SettingsView } from '@/components/Settings/SettingsView';
import { getLocalProjects, getLastActiveProjectId } from '@/lib/storage';
import { Project } from '@/types';

export default function GlobalSettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  const refresh = () => {
    const list = getLocalProjects();
    setProjects(list);
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeId = getLastActiveProjectId();
  const currentProject = projects.find(p => p.id === activeId) || projects[0] || null;

  return (
    <AppLayout currentProject={currentProject} onRefresh={refresh}>
      <SettingsView project={currentProject} onProjectUpdated={refresh} />
    </AppLayout>
  );
}

