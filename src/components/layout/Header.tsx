import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC = () => {
  const { profile } = useAuth();

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8 sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or Page Title could go here */}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-foreground leading-none group-hover:text-primary transition-colors">
              {profile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
              {profile?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:border-primary transition-all">
            <UserIcon size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};
