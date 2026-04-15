import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FileUp, Download, AlertCircle, CheckCircle2, Trash2, UploadCloud, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { formatPhoneNumber, cn } from '../lib/utils';

// Check if environment variables are available
const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const ImportPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [existingBeneficiaires, setExistingBeneficiaires] = useState<any[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState({ exact: 0, suspect: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fetch existing beneficiaries for comparison
    const { data: existingData, error: fetchError } = await supabase
      .from('beneficiaires')
      .select('nom_prenoms, num_cin, num_mobile_money, region, district');

    if (fetchError) {
      console.error('Duplicate analysis skipped due to error:', fetchError);
      // We continue anyway, just no duplicate detection
    }
    
    setExistingBeneficiaires(existingData || []);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        console.log('Données brutes Excel détectées:', jsonData);

        if (!jsonData || jsonData.length === 0) {
          showNotification('Le fichier est vide ou illisible', 'warning');
          return;
        }

        const fieldMapping: Record<string, string> = {
          'nom': 'nom_prenoms',
          'prenom': 'nom_prenoms',
          'prénom': 'nom_prenoms',
          'nom et prenoms': 'nom_prenoms',
          'nom & prenoms': 'nom_prenoms',
          'nom prenoms': 'nom_prenoms',
          'nom et prénom': 'nom_prenoms',
          'nom et prénoms': 'nom_prenoms',
          'noms': 'nom_prenoms',
          'prénoms': 'nom_prenoms',
          'full name': 'nom_prenoms',
          'fullname': 'nom_prenoms',
          'region': 'region',
          'région': 'region',
          'district': 'district',
          'fonction': 'fonction',
          'poste': 'fonction',
          'cin': 'num_cin',
          'num cin': 'num_cin',
          'n° cin': 'num_cin',
          'carte identite': 'num_cin',
          'mobile money': 'num_mobile_money',
          'telephone': 'num_mobile_money',
          'téléphone': 'num_mobile_money',
          'contact': 'num_mobile_money',
          'mobile': 'num_mobile_money',
        };

        let exactCount = 0;
        let suspectCount = 0;

        const formattedData = jsonData.map((row: any) => {
          const newRow: any = {
            region: 'Inconnue',
            district: 'Inconnu',
            nom_prenoms: '',
            fonction: 'Autre',
            num_cin: null,
            num_mobile_money: null,
            duplicateType: 'new' as 'new' | 'exact' | 'suspect'
          };
          
          Object.entries(row).forEach(([key, value]) => {
            const rawKey = key.toLowerCase().trim();
            const normalizedKey = rawKey.replace(/[_\s]+/g, ' ');
            
            const targetFields = ['region', 'district', 'nom_prenoms', 'fonction', 'num_cin', 'num_mobile_money'];
            if (targetFields.includes(rawKey)) {
              const val = String(value || '').trim();
              if (val) newRow[rawKey] = val;
              return;
            }

            const targetField = fieldMapping[normalizedKey] || fieldMapping[rawKey];
            if (targetField) {
              const val = String(value || '').trim();
              if (val) newRow[targetField] = val;
            }
          });

          // Standardize phone for comparison
          if (newRow.num_mobile_money) {
            newRow.num_mobile_money = String(newRow.num_mobile_money).replace(/\D/g, '');
            if (newRow.num_mobile_money.length === 9 && newRow.num_mobile_money[0] !== '0') {
              newRow.num_mobile_money = '0' + newRow.num_mobile_money;
            }
          }

          // Duplicate detection logic
          const matchExact = existingData?.find(existing => 
            (existing.num_cin === newRow.num_cin && newRow.num_cin) &&
            (existing.num_mobile_money === newRow.num_mobile_money && newRow.num_mobile_money) &&
            existing.region?.toLowerCase() === newRow.region?.toLowerCase() &&
            existing.district?.toLowerCase() === newRow.district?.toLowerCase()
          );

          if (matchExact) {
            newRow.duplicateType = 'exact';
            newRow.matchData = matchExact;
            exactCount++;
          } else {
            const matchSuspect = existingData?.find(existing => 
              (existing.num_cin === newRow.num_cin && newRow.num_cin) &&
              (existing.num_mobile_money === newRow.num_mobile_money && newRow.num_mobile_money)
            );
            if (matchSuspect) {
              newRow.duplicateType = 'suspect';
              newRow.matchData = matchSuspect;
              suspectCount++;
            }
          }
          
          return newRow;
        }).filter(row => row.nom_prenoms && row.nom_prenoms.length >= 2);
        
        setAnalysisStatus({ exact: exactCount, suspect: suspectCount, total: formattedData.length });
        setPreviewData(formattedData);
        showNotification(`${formattedData.length} records analysés. ${exactCount + suspectCount} doublons détectés.`, 'info');
      } catch (err: any) {
        console.error('File read error:', err);
        showNotification('Erreur lors de la lecture du fichier', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const [importProgress, setImportProgress] = useState(0);

  const handleImport = async () => {
    console.log('--- Debug Import ---');
    
    const exactDuplicates = previewData.filter(d => d.duplicateType === 'exact');
    const suspectDuplicates = previewData.filter(d => d.duplicateType === 'suspect');
    const newRecords = previewData.filter(d => d.duplicateType === 'new');
    
    let dataToImport = [...newRecords];

    if (suspectDuplicates.length > 0) {
      const confirmSuspect = window.confirm(
        `${suspectDuplicates.length} doublon(s) soupçonné(s) détecté(s) (CIN/Mobile identiques mais localisation différente).\n\nVoulez-vous les inclure dans l'importation ?\n\n- Cliquez sur OK pour les importer.\n- Cliquez sur Annuler pour n'importer que les nouveaux bénéficiaires.`
      );
      if (confirmSuspect) {
        dataToImport = [...newRecords, ...suspectDuplicates];
      }
    }

    if (!user) {
      showNotification('Utilisateur non connecté', 'error');
      return;
    }

    if (dataToImport.length === 0) {
      if (exactDuplicates.length > 0 && newRecords.length === 0 && suspectDuplicates.length === 0) {
        showNotification('Tous les enregistrements sont des doublons exacts déjà présents.', 'warning');
      } else {
        showNotification('Aucune donnée sélectionnée pour l\'importation.', 'warning');
      }
      return;
    }

    setLoading(true);
    setImportProgress(0);
    
    try {
      if (isAdmin) {
        console.log('Mode Admin: Batch Insert...');
        const batchSize = 25;
        const totalRecords = dataToImport.length;
        
        for (let i = 0; i < totalRecords; i += batchSize) {
          const batch = dataToImport.slice(i, i + batchSize).map((d) => {
            const { duplicateType, matchData, ...fields } = d;
            return {
              ...fields,
              created_by: user.id,
            };
          });
          
          console.log(`Inserting batch ${i/batchSize + 1}...`, batch);
          const { error } = await supabase.from('beneficiaires').insert(batch);
          
          if (error) {
            console.error('Supabase Batch Error:', error);
            throw new Error(`Erreur Supabase (${error.code}): ${error.message}`);
          }
          
          setImportProgress(Math.round(((i + batch.length) / totalRecords) * 100));
        }
        showNotification(`${totalRecords} bénéficiaires importés`, 'success');
      } else {
        console.log('Mode Utilisateur: Sending to pending_actions...');
        const payload = dataToImport.map(({ duplicateType, matchData, ...fields }) => fields);
        
        // --- Sécurité : Vérifier le profil de manière plus robuste ---
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Profile check error:', profileError);
        }

        if (!existingProfile) {
          console.log('Profile missing, attempt to create...');
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            role: 'user'
          });
          if (insertError) console.error('Profile auto-creation error:', insertError);
        }
        // -------------------------------------------------------------
        
        const { error } = await supabase.from('pending_actions').insert([
          {
            action_type: 'create',
            target_table: 'beneficiaires',
            payload: payload,
            requested_by: user.id,
          },
        ]);
        
        if (error) {
          console.error('Pending Actions Error:', error);
          throw new Error(`Erreur lors de l'envoi de la demande: ${error.message}`);
        }
        
        showNotification('Demande d\'importation envoyée avec succès', 'info');
      }
      
      setTimeout(() => navigate('/beneficiaires'), 1000);
    } catch (error: any) {
      console.error('Full Import Error:', error);
      alert(`Erreur d'importation : ${error.message}`);
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
      setImportProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = [{ region: 'Analamanga', district: 'ANTANANARIVO', nom_prenoms: 'Jean RAKOTO', fonction: 'Maire', num_cin: '123456789012', num_mobile_money: '0340000000' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_g_formation.xlsx');
  };

  return (
    <div className="space-y-8">
      {!isSupabaseConfigured && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <div>
            <p className="font-bold">Configuration Supabase manquante !</p>
            <p className="text-sm">Veuillez configurer les variables d'environnement dans Netlify (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importation Excel</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Détection automatique de doublons activée</p>
            <Badge variant={isAdmin ? 'success' : 'info'} className="text-[10px] py-0 px-1.5">
              {isAdmin ? 'Mode Admin' : 'Mode Utilisateur'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" leftIcon={<Download size={18} />} onClick={downloadTemplate}>
          Template
        </Button>
      </div>

      {previewData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nouveaux</p>
              <p className="text-xl font-bold">{(analysisStatus.total - analysisStatus.exact - analysisStatus.suspect)}</p>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><AlertCircle size={20} /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doublons Exacts</p>
              <p className="text-xl font-bold">{analysisStatus.exact}</p>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Soupçonnés</p>
              <p className="text-xl font-bold">{analysisStatus.suspect}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
          >
            <UploadCloud size={32} className="text-muted-foreground group-hover:text-primary" />
            <p className="font-semibold text-center text-sm">Cliquez pour importer votre fichier</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 border border-blue-100 dark:border-blue-900/30">
            <AlertCircle className="text-blue-600 shrink-0" size={18} />
            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-bold mb-1">Règle de doublon :</p>
              <p>Un doublon est détecté si la <strong>Localisation</strong>, le <strong>CIN</strong> et le <strong>Mobile Money</strong> sont identiques à une entrée existante.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <h3 className="font-semibold text-sm">Aperçu des données</h3>
            </div>
          </div>

          <div className="flex-grow overflow-auto max-h-[500px]">
            {previewData.length > 0 ? (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-surface z-10 border-b border-border shadow-sm">
                  <tr>
                    <th className="px-4 py-2 font-bold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2 font-bold text-muted-foreground uppercase">Localisation</th>
                    <th className="px-4 py-2 font-bold text-muted-foreground uppercase">Identité & Fonction</th>
                    <th className="px-4 py-2 font-bold text-muted-foreground uppercase">CIN</th>
                    <th className="px-4 py-2 font-bold text-muted-foreground uppercase">Mobile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.map((row, i) => (
                    <tr key={i} className={cn(
                      "hover:bg-muted/30 transition-colors border-l-4",
                      row.duplicateType === 'exact' ? "bg-red-50/50 border-danger" : row.duplicateType === 'suspect' ? "bg-orange-50/50 border-warning" : "border-transparent"
                    )}>
                      <td className="px-4 py-2">
                        {row.duplicateType === 'exact' ? <Badge variant="danger">Doublon</Badge> : 
                         row.duplicateType === 'suspect' ? <Badge variant="warning">Soupçon</Badge> : 
                         <Badge variant="success">Nouveau</Badge>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Importé:</div>
                        <div className="font-semibold">{row.region}</div>
                        <div className="text-[10px] text-muted-foreground">{row.district}</div>
                        
                        {row.matchData && (
                          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">En base:</div>
                            <div className={cn(
                              "font-medium",
                              row.matchData.region === row.region && row.matchData.district === row.district ? "text-danger" : "text-foreground"
                            )}>
                              {row.matchData.region}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{row.matchData.district}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-[10px] text-muted-foreground opacity-0">.</div>
                        <div className="font-semibold text-sm">{row.nom_prenoms}</div>
                        <div className="text-[10px] text-muted-foreground">{row.fonction}</div>
                        
                        {row.matchData && (
                          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                            <div className={cn(
                              "font-medium text-sm",
                              row.matchData.nom_prenoms === row.nom_prenoms ? "text-danger" : "text-foreground"
                            )}>
                              {row.matchData.nom_prenoms}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-[10px] text-muted-foreground opacity-0">.</div>
                        <div className="font-mono">{row.num_cin || '—'}</div>
                        
                        {row.matchData && (
                          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                            <div className={cn(
                              "font-mono",
                              row.matchData.num_cin === row.num_cin ? "text-danger" : "text-foreground"
                            )}>
                              {row.matchData.num_cin || '—'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-[10px] text-muted-foreground opacity-0">.</div>
                        <div className="whitespace-nowrap font-medium">{formatPhoneNumber(row.num_mobile_money)}</div>
                        
                        {row.matchData && (
                          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                            <div className={cn(
                              "whitespace-nowrap font-medium",
                              row.matchData.num_mobile_money === row.num_mobile_money ? "text-danger" : "text-foreground"
                            )}>
                              {formatPhoneNumber(row.matchData.num_mobile_money)}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic">
                <FileUp size={40} className="mb-2 opacity-10" />
                <p>Aucune donnée à analyser</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {analysisStatus.exact > 0 && <span className="text-danger font-bold mr-2">{analysisStatus.exact} doublons seront ignorés.</span>}
            </div>
            <Button onClick={handleImport} disabled={previewData.length === 0 || loading} isLoading={loading}>
              Lancer l'importation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
