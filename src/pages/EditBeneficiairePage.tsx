import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { Save, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export const EditBeneficiairePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    region: '',
    district: '',
    nom_prenoms: '',
    fonction: '',
    num_cin: '',
    num_mobile_money: '',
  });

  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchBeneficiaire = async () => {
      if (!id) return;
      try {
        setFetching(true);
        const { data, error } = await supabase
          .from('beneficiaires')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            region: data.region || '',
            district: data.district || '',
            nom_prenoms: data.nom_prenoms || '',
            fonction: data.fonction || '',
            num_cin: data.num_cin || '',
            num_mobile_money: data.num_mobile_money || '',
          });
        }
      } catch (error: any) {
        console.error('Error fetching beneficiaire:', error);
        showNotification('Impossible de charger les données du bénéficiaire', 'error');
        navigate('/beneficiaires');
      } finally {
        setFetching(false);
      }
    };

    fetchBeneficiaire();
  }, [id, navigate, showNotification]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'num_cin') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 12) {
        if (digits.length === 12) {
          finalValue = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1.$2.$3.$4');
        } else {
          finalValue = digits;
        }
      } else {
        finalValue = digits.substring(0, 12);
      }
    }

    if (name === 'num_mobile_money') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 10) {
        if (digits.length === 10) {
          finalValue = digits.replace(/(\d{3})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4');
        } else if (digits.length === 9 && digits[0] !== '0') {
          finalValue = ('0' + digits).replace(/(\d{3})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4');
        } else {
          finalValue = digits;
        }
      } else {
        finalValue = digits.substring(0, 10);
      }
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);
    const dataToUpdate = {
      ...formData,
      nom_prenoms: formData.nom_prenoms.trim(),
      region: formData.region.trim(),
      district: formData.district.trim(),
    };

    try {
      if (isAdmin) {
        // Log to audit before update if possible, but keep it simple for now
        const { error } = await supabase
          .from('beneficiaires')
          .update(dataToUpdate)
          .eq('id', id);
        
        if (error) throw error;
        showNotification('Informations mises à jour avec succès', 'success');
      } else {
        // Create pending action for update
        const { error } = await supabase.from('pending_actions').insert([
          {
            action_type: 'update',
            target_table: 'beneficiaires',
            target_id: id,
            payload: dataToUpdate,
            requested_by: user.id,
            comment: comment.trim() || 'Modification demandée par l\'utilisateur',
          },
        ]);
        if (error) throw error;
        showNotification('Demande de modification envoyée pour validation', 'info');
      }
      navigate('/beneficiaires');
    } catch (error: any) {
      console.error('Error updating beneficiaire:', error);
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  if (fetching) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modifier le bénéficiaire</h1>
          <p className="text-muted-foreground">Mettez à jour les informations enregistrées</p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-surface p-8 rounded-xl border border-border shadow-sm space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-full">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Informations Personnelles</h3>
            <Input
              label="Nom et Prénoms"
              name="nom_prenoms"
              value={formData.nom_prenoms}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Fonction"
            name="fonction"
            value={formData.fonction}
            onChange={handleChange}
            placeholder="Ex: Agriculteur, Commerçant..."
            required
          />

          <Input
            label="Numéro CIN"
            name="num_cin"
            value={formData.num_cin}
            onChange={handleChange}
            maxLength={15}
          />

          <Input
            label="Numéro Mobile Money"
            name="num_mobile_money"
            value={formData.num_mobile_money}
            onChange={handleChange}
          />

          <div className="col-span-full mt-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Localisation Administrative</h3>
          </div>

          <Input
            label="Région"
            name="region"
            value={formData.region}
            onChange={handleChange}
            required
          />

          <Input
            label="District"
            name="district"
            value={formData.district}
            onChange={handleChange}
            required
          />

          {!isAdmin && (
            <div className="col-span-full pt-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 font-semibold text-danger">Motif de la modification</h3>
              <textarea
                className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                placeholder="Veuillez expliquer pourquoi vous demandez cette modification..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required={!isAdmin}
              />
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" leftIcon={<Save size={18} />} isLoading={loading}>
            Enregistrer les modifications
          </Button>
        </div>
      </motion.form>
    </div>
  );
};
