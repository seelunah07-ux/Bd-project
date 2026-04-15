import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Spinner: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => {
  return (
    <Loader2
      className={cn('animate-spin text-primary', className)}
      size={size}
    />
  );
};

export const FullPageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[9999]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={40} />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Chargement en cours...</p>
      </div>
    </div>
  );
};
