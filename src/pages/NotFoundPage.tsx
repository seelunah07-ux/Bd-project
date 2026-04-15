import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-24 h-24 bg-danger/10 rounded-full flex items-center justify-center text-danger">
        <AlertCircle size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Page non trouvée</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
      </div>
      <Link to="/">
        <Button leftIcon={<Home size={18} />}>
          Retour à l'accueil
        </Button>
      </Link>
    </div>
  );
};
