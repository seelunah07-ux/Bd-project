import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfilePage: React.FC = () => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;
      
      showNotification('Mot de passe mis à jour avec succès', 'success');
      setFormData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
        <p className="text-muted-foreground">Gérez vos informations de compte et votre sécurité</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface p-8 rounded-xl border border-border shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3 text-primary">
            <ShieldCheck size={24} />
            <h3 className="text-lg font-bold">Sécurité du compte</h3>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour protéger votre accès, nous vous recommandons d'utiliser un mot de passe unique que vous n'utilisez pas sur d'autres sites.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-4">
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Entrez votre nouveau mot de passe"
                icon={<Lock size={18} />}
                required
              />
              <Input
                label="Confirmez le mot de passe"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirmez votre nouveau mot de passe"
                icon={<KeyRound size={18} />}
                required
              />
            </div>

            <div className="pt-4">
              <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
                Mettre à jour le mot de passe
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
