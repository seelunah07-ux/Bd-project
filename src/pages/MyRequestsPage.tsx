import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Clock, CheckCircle2, XCircle, Search, RefreshCw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';

interface PendingAction {
  id: string;
  action_type: 'create' | 'update' | 'delete';
  target_table: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  payload: any;
  comment?: string;
  reviewed_at?: string;
}

export const MyRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showNotification } = useNotification();
  const [selectedRequest, setSelectedRequest] = useState<PendingAction | null>(null);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_actions')
        .select('*')
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      showNotification('Erreur lors du chargement des demandes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning"><Clock size={12} className="mr-1" /> En attente</Badge>;
      case 'approved':
        return <Badge variant="success"><CheckCircle2 size={12} className="mr-1" /> Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="danger"><XCircle size={12} className="mr-1" /> Rejetée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'create': return 'Création / Import';
      case 'update': return 'Modification';
      case 'delete': return 'Suppression';
      default: return type;
    }
  };

  const filteredRequests = requests.filter(r => 
    getActionLabel(r.action_type).toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes Demandes</h1>
          <p className="text-muted-foreground">Suivez l'état de vos demandes d'autorisation</p>
        </div>
        <Button 
          variant="outline" 
          leftIcon={<RefreshCw size={18} />}
          onClick={fetchRequests}
          disabled={loading}
        >
          Actualiser
        </Button>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher une demande..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={18} />}
            />
          </div>
        </div>

        <div className="overflow-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-surface border-b border-border shadow-sm">
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type d'action</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre d'éléments</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Aucune demande trouvée
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-foreground">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{getActionLabel(req.action_type)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {Array.isArray(req.payload) ? req.payload.length : 1}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedRequest(req)}
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-6 border border-border"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Détails de la demande</h2>
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground italic">Type d'action</p>
                  <p className="font-semibold">{getActionLabel(selectedRequest.action_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground italic">Date de demande</p>
                  <p className="font-semibold">{formatDate(selectedRequest.created_at)}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div className="col-span-2 pt-2 border-t border-border mt-2">
                    <p className="text-muted-foreground italic">Examinée le</p>
                    <p className="font-semibold">{formatDate(selectedRequest.reviewed_at)}</p>
                  </div>
                )}
                {selectedRequest.comment && (
                  <div className="col-span-2 pt-2 border-t border-border mt-2">
                    <p className="text-muted-foreground italic font-semibold text-primary">Commentaire admin :</p>
                    <p className="p-2 bg-background rounded mt-1">{selectedRequest.comment}</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Aperçu du contenu :</p>
                <div className="max-h-48 overflow-y-auto bg-background rounded-lg border border-border p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(selectedRequest.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedRequest(null)}>
                  Fermer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
