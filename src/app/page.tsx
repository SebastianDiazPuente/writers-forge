'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ProjectSelector } from '@/components/ProjectSelector';

export default function HomePage() {
  return (
    <AppLayout>
      <ProjectSelector />
    </AppLayout>
  );
}
