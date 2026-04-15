import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuditLog } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { History, Search, User, Database, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showNotification } = useNotification();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          profiles:performed_by (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedLogs = data.map((l: any) => ({
        ...l,
        performer_name: l.profiles?.full_name || 'Système',
      }));
      
      setLogs(formattedLogs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      showNotification('Erreur lors du chargement des logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.performer_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal d'audit</h1>
          <p className="text-muted-foreground">Historique complet des actions effectuées sur le système</p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-surface border-b border-border shadow-sm">
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Table</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-primary/10 text-primary">
                          <History size={14} />
                        </div>
                        <span className="font-semibold text-sm">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {log.performer_name}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[10px] px-2 py-0.5 bg-muted rounded">{log.table_name}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary-hover text-sm font-medium flex items-center justify-end gap-1 ml-auto"
                      >
                        Voir <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 border border-border">
            <h2 className="text-xl font-bold">Détails de l'action</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground italic mb-1">Anciennes données</p>
                <pre className="text-xs max-h-40 overflow-auto">
                  {JSON.stringify(selectedLog.old_data, null, 2) || '—'}
                </pre>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-primary font-bold mb-1">Nouvelles données</p>
                <pre className="text-xs max-h-40 overflow-auto text-primary">
                  {JSON.stringify(selectedLog.new_data, null, 2) || '—'}
                </pre>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSelectedLog(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
