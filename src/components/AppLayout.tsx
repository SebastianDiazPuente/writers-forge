'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { AuthModal } from './AuthModal';
import { FallbackAlertModal } from './FallbackAlertModal';
import { Project } from '@/types';
import { DATA_UPDATED_EVENT } from '@/lib/storage';

interface AppLayoutProps {
  children: React.ReactNode;
  currentProject?: Project | null;
  onRefresh?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  currentProject, 
  onRefresh 
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleDataUpdated = () => {
      if (onRefresh) onRefresh();
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [onRefresh]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        currentProject={currentProject} 
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRefresh={onRefresh}
      />
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      <FallbackAlertModal />
    </div>
  );
};

