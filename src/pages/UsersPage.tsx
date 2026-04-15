import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { UserPlus, Mail, Shield, Trash2, Edit2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showNotification } = useNotification();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role: '' as 'admin' | 'user'
  });
  const [addFormData, setAddFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'admin' | 'user'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showNotification('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (user: Profile) => {
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        showNotification('Impossible de supprimer le dernier administrateur', 'warning');
        return;
      }
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.full_name} ?`)) {
      try {
        setLoading(true);
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) throw error;
        
        showNotification('Utilisateur supprimé localement.', 'info');
        fetchUsers();
      } catch (error: any) {
        showNotification(error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name || '',
      role: user.role || 'user'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          role: editFormData.role
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      showNotification('Utilisateur mis à jour', 'success');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
      if (error) throw error;
      showNotification(`Un email de réinitialisation a été envoyé à ${selectedUser.email}`, 'success');
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.email || !addFormData.password || !addFormData.full_name) {
      showNotification('Veuillez remplir tous les champs', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: addFormData.email,
        password: addFormData.password,
        options: {
          data: {
            full_name: addFormData.full_name,
            role: addFormData.role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Force creation/update of profile to ensure visibility
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: authData.user.id,
            full_name: addFormData.full_name,
            email: addFormData.email,
            role: addFormData.role
          });
          
        if (profileError) console.error('Profile Upsert Error:', profileError);
      }

      showNotification('Utilisateur créé avec succès !', 'success');
      setIsAddModalOpen(false);
      setAddFormData({ email: '', password: '', full_name: '', role: 'user' });
      
      // Petit délai pour laisser Supabase respirer
      setTimeout(() => {
        fetchUsers();
      }, 1000);
      
    } catch (error: any) {
      console.error('Create User Error:', error);
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les comptes et les rôles d'accès</p>
        </div>
        <Button 
          leftIcon={<UserPlus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Nouvel utilisateur
        </Button>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={18} />}
            />
          </div>
        </div>

        <div className="overflow-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-20 bg-surface border-b border-border shadow-sm">
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'inscription</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{user.full_name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail size={12} />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'danger' : 'neutral'}>
                        <div className="flex items-center gap-1">
                          {user.role === 'admin' && <Shield size={10} />}
                          {user.role}
                        </div>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-danger hover:text-danger"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface w-full max-w-md rounded-xl shadow-2xl p-6 space-y-6 border border-border"
          >
            <h2 className="text-xl font-bold">Modifier l'utilisateur</h2>
            
            <div className="space-y-4">
              <Input
                label="Nom complet"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rôle</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'user' })}
                >
                  <option value="user">Utilisateur (Standard)</option>
                  <option value="admin">Administrateur (Complet)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Sécurité & Accès</p>
                <Button 
                  variant="outline" 
                  className="w-full text-xs flex items-center justify-center gap-2" 
                  onClick={handlePasswordReset}
                >
                  <Mail size={14} />
                  Envoyer lien de réinitialisation
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  L'utilisateur recevra un email pour changer son mot de passe.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdate} isLoading={loading}>
                Sauvegarder
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface w-full max-w-md rounded-xl shadow-2xl p-6 space-y-6 border border-border"
          >
            <div className="flex items-center gap-3 text-primary">
              <UserPlus size={24} />
              <h2 className="text-xl font-bold">Nouvel utilisateur</h2>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <Input
                label="Nom complet"
                placeholder="Ex: Jean Rakoto"
                value={addFormData.full_name}
                onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                required
              />

              <Input
                label="Adresse Email"
                type="email"
                placeholder="utilisateur@domaine.com"
                value={addFormData.email}
                onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                required
              />

              <Input
                label="Mot de passe"
                type="password"
                placeholder="Min. 6 caractères"
                value={addFormData.password}
                onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rôle attribué</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as 'admin' | 'user' })}
                >
                  <option value="user">Utilisateur (Standard)</option>
                  <option value="admin">Administrateur (Complet)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" isLoading={loading}>
                  Créer le compte
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
