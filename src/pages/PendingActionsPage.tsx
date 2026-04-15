import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PendingAction } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Check, X, Eye, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';

export const PendingActionsPage: React.FC = () => {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showNotification } = useNotification();

  const fetchActions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_actions')
        .select(`
          *,
          profiles:requested_by (full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedActions = data.map((a: any) => ({
        ...a,
        requester_name: a.profiles?.full_name || 'Utilisateur inconnu',
      }));
      
      setActions(formattedActions);
    } catch (error: any) {
      console.error('Error fetching pending actions:', error);
      showNotification('Erreur lors du chargement des validations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();

    const subscription = supabase
      .channel('pending_actions_changes')
      .on('postgres_changes' as any, { event: '*', table: 'pending_actions' }, () => {
        fetchActions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const { data: { user: reviewer } } = await supabase.auth.getUser();
      if (!reviewer) return;

      const action = actions.find(a => a.id === id);
      if (!action) return;

      if (status === 'approved') {
        // Execute the actual action
        if (action.action_type === 'create') {
          if (Array.isArray(action.payload)) {
            // Bulk import with batching (max 50 per batch)
            const batchSize = 50;
            const payload = action.payload;
            for (let i = 0; i < payload.length; i += batchSize) {
              const batch = payload.slice(i, i + batchSize).map(item => ({
                ...item,
                created_by: action.requested_by
              }));
              const { error: insertError } = await supabase
                .from(action.target_table)
                .insert(batch);
              if (insertError) throw insertError;
            }
          } else {
            // Single create
            const { error: insertError } = await supabase
              .from(action.target_table)
              .insert({ ...action.payload, created_by: action.requested_by });
            if (insertError) throw insertError;
          }
        } else if (action.action_type === 'update') {
          const { error: updateError } = await supabase
            .from(action.target_table)
            .update(action.payload)
            .eq('id', action.target_id);
          if (updateError) throw updateError;
        } else if (action.action_type === 'delete') {
          const { error: deleteError } = await supabase
            .from(action.target_table)
            .delete()
            .eq('id', action.target_id);
          if (deleteError) throw deleteError;
        }

        // Log to audit log
        await supabase.from('audit_log').insert({
          action: `Approve ${action.action_type}`,
          table_name: action.target_table,
          record_id: action.target_id,
          new_data: Array.isArray(action.payload) ? { count: action.payload.length } : action.payload,
          performed_by: reviewer.id
        });
      }

      // Update pending action status
      const { error } = await supabase
        .from('pending_actions')
        .update({
          status,
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      showNotification(
        status === 'approved' ? 'Action approuvée et exécutée' : 'Action rejetée',
        status === 'approved' ? 'success' : 'info'
      );
      fetchActions();
    } catch (error: any) {
      console.error('Error reviewing action:', error);
      showNotification(error.message || 'Erreur lors de la validation', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Validations en attente</h1>
        <p className="text-muted-foreground">Approuvez ou rejetez les demandes de modification</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : actions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface p-12 rounded-xl border border-border text-center"
            >
              <Clock size={48} className="mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Aucune action en attente de validation</p>
            </motion.div>
          ) : (
            actions.map((action) => (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden"
              >
                <div className="p-6 flex flex-col md:flex-row gap-6">
                  <div className="flex-grow space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={action.action_type === 'create' ? 'success' : 'warning'}>
                        {action.action_type === 'create' ? 'Création' : 'Modification'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User size={14} />
                        <span className="font-medium text-foreground">{action.requester_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatDate(action.created_at)}</span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {action.action_type === 'create' 
                          ? Array.isArray(action.payload) 
                            ? `Importation massive (${action.payload.length} bénéficiaires)`
                            : `Ajout de ${action.payload.nom_prenoms}`
                          : `Mise à jour de l'ID ${action.target_id}`
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Table cible : <span className="font-mono">{action.target_table}</span>
                      </p>
                    </div>

                    {action.comment && (
                      <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-lg">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Motif de la demande :</p>
                        <p className="text-sm italic text-foreground">"{action.comment}"</p>
                      </div>
                    )}

                    <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground/60">
                        {JSON.stringify(action.payload, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-success hover:bg-green-700"
                      leftIcon={<Check size={16} />}
                      onClick={() => handleReview(action.id, 'approved')}
                      isLoading={processingId === action.id}
                    >
                      Approuver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-danger border-danger/20 hover:bg-red-50"
                      leftIcon={<X size={16} />}
                      onClick={() => handleReview(action.id, 'rejected')}
                      isLoading={processingId === action.id}
                    >
                      Rejeter
                    </Button>
                    <Button variant="ghost" size="sm" leftIcon={<Eye size={16} />}>
                      Détails
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
