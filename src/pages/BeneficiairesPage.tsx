import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaires } from '../hooks/useBeneficiaires';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Search, Filter, Download, Plus, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, formatPhoneNumber } from '../lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const BeneficiairesPage: React.FC = () => {
  const { beneficiaires, loading, refresh } = useBeneficiaires();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [fonctionFilter, setFonctionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Get unique values for filters
  const regions = useMemo(() => 
    ['all', ...new Set(beneficiaires.map(b => b.region).filter(Boolean))].sort()
  , [beneficiaires]);
  
  const fonctions = useMemo(() => 
    ['all', ...new Set(beneficiaires.map(b => b.fonction).filter(Boolean))].sort()
  , [beneficiaires]);

  const filteredData = useMemo(() => {
    return beneficiaires.filter((b) => {
      const searchStr = search.toLowerCase();
      const nom = (b.nom_prenoms || '').toLowerCase();
      const region = (b.region || '').toLowerCase();
      const fonction = (b.fonction || '').toLowerCase();
      const cin = (b.num_cin || '');

      const matchesSearch = nom.includes(searchStr) ||
                          region.includes(searchStr) ||
                          fonction.includes(searchStr) ||
                          cin.includes(searchStr);
      
      const matchesRegion = regionFilter === 'all' || b.region === regionFilter;
      const matchesFonction = fonctionFilter === 'all' || b.fonction === fonctionFilter;

      return matchesSearch && matchesRegion && matchesFonction;
    });
  }, [beneficiaires, search, regionFilter, fonctionFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    // Format data for export
    const exportData = filteredData.map(b => ({
      'Région': b.region,
      'District': b.district,
      'Nom & Prénoms': b.nom_prenoms,
      'Fonction': b.fonction,
      'CIN': b.num_cin,
      'Mobile Money': formatPhoneNumber(b.num_mobile_money),
      'Date d\'ajout': formatDate(b.created_at)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bénéficiaires Filtrés');
    
    // Auto-size columns
    const wscols = [
      {wch: 30}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 25}
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `export_beneficiaires_filtres_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer ${name} ?`)) return;

    try {
      if (isAdmin) {
        const { error } = await supabase.from('beneficiaires').delete().eq('id', id);
        if (error) throw error;
        showNotification(`${name} a été supprimé`, 'success');
        refresh();
      } else {
        const reason = window.prompt(`Motif de la suppression de ${name} :`);
        if (!reason) {
          showNotification('Le motif est obligatoire pour demander une suppression', 'warning');
          return;
        }

        const { error } = await supabase.from('pending_actions').insert([
          {
            action_type: 'delete',
            target_table: 'beneficiaires',
            target_id: id,
            payload: { name },
            requested_by: user?.id,
            comment: reason,
          },
        ]);
        if (error) throw error;
        showNotification('Demande de suppression envoyée pour validation', 'info');
      }
    } catch (error: any) {
      console.error('Error deleting:', error);
      showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bénéficiaires</h1>
          <p className="text-muted-foreground">Liste complète ({filteredData.length} résultats)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            leftIcon={<Download size={18} />} 
            onClick={exportToExcel}
            disabled={filteredData.length === 0}
          >
            Exporter la vue
          </Button>
          <Button leftIcon={<Plus size={18} />} onClick={() => navigate('/beneficiaires/add')}>
            Nouveau
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Rechercher par nom, CIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="all">Toutes les régions</option>
                {regions.filter(r => r !== 'all').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select 
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                value={fonctionFilter}
                onChange={(e) => setFonctionFilter(e.target.value)}
              >
                <option value="all">Toutes les fonctions</option>
                {fonctions.filter(f => f !== 'all').map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              {(search || regionFilter !== 'all' || fonctionFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSearch('');
                  setRegionFilter('all');
                  setFonctionFilter('all');
                }}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-surface border-b border-border shadow-sm">
              <tr className="bg-muted/50">
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Région</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">District</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom & Prénoms</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Fonction</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">CIN</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mobile Money</th>
                <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr key="loading">
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Spinner className="mx-auto" />
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Aucun bénéficiaire trouvé avec ces critères
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((b) => (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-medium text-foreground">{b.region}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-muted-foreground">{b.district}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm">{b.nom_prenoms}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info" className="text-[10px]">{b.fonction}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {b.num_cin || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap font-medium">
                        {formatPhoneNumber(b.num_mobile_money)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => navigate(`/beneficiaires/edit/${b.id}`)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-danger hover:text-danger"
                            onClick={() => handleDelete(b.id, b.nom_prenoms)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Affichage de <span className="font-medium text-foreground">{paginatedData.length}</span> sur <span className="font-medium text-foreground">{filteredData.length}</span> bénéficiaires
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      currentPage === pageNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'hover:bg-muted text-muted-foreground'
                      )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
