import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileUp,
  Clock,
  UserCog,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { isAdmin, signOut } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
    { icon: Users, label: 'Bénéficiaires', path: '/beneficiaires' },
    { icon: UserPlus, label: 'Ajouter', path: '/beneficiaires/add' },
    { icon: FileUp, label: 'Import Excel', path: '/import' },
    { icon: History, label: 'Suivi Demandes', path: '/requests' },
    { icon: Settings, label: 'Mon Profil', path: '/profile' },
  ];

  const adminItems = [
    { icon: Clock, label: 'Validations', path: '/pending' },
    { icon: UserCog, label: 'Utilisateurs', path: '/users' },
    { icon: History, label: 'Audit', path: '/audit' },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-surface border-r border-border transition-all duration-300 z-40 flex flex-col',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-primary text-lg truncate"
          >
            Gestion Formation
          </motion.span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-grow py-6 px-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.filter(item => !isAdmin || item.path !== '/requests').map((item) => (
            <SidebarItem
              key={item.path}
              {...item}
              isCollapsed={isCollapsed}
              isActive={location.pathname === item.path}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="mt-8">
            {!isCollapsed && (
              <p className="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Administration
              </p>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  {...item}
                  isCollapsed={isCollapsed}
                  isActive={location.pathname === item.path}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LogOut size={20} className="group-hover:scale-110 transition-transform" />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: any;
  label: string;
  path: string;
  isCollapsed: boolean;
  isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, path, isCollapsed, isActive }) => {
  return (
    <NavLink
      to={path}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        isCollapsed && 'justify-center px-0'
      )}
    >
      <Icon
        size={20}
        className={cn(
          'transition-transform group-hover:scale-110',
          isActive && 'text-primary'
        )}
      />
      {!isCollapsed && <span>{label}</span>}
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="active-pill"
          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
        />
      )}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  );
};
