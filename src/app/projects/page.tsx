'use client';

import { AppLayout } from '@/components/AppLayout';
import { ProjectSelector } from '@/components/ProjectSelector';

export default function ProjectsPage() {
  return (
    <AppLayout>
      <ProjectSelector />
    </AppLayout>
  );
}
