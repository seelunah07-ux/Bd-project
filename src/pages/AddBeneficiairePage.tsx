import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export const AddBeneficiairePage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    region: '',
    district: '',
    nom_prenoms: '',
    fonction: '',
    num_cin: '',
    num_mobile_money: '',
  });

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
    if (!user) {
      showNotification('Vous devez être connecté pour effectuer cette action', 'error');
      return;
    }

    setLoading(true);

    // Cleanup data to ensure no empty strings for nullable fields
    const dataToInsert = {
      nom_prenoms: formData.nom_prenoms.trim(),
      fonction: formData.fonction,
      region: formData.region.trim(),
      district: formData.district.trim(),
      num_cin: formData.num_cin.trim() || null,
      num_mobile_money: formData.num_mobile_money.trim() || null,
      created_by: user.id
    };

    try {
      if (isAdmin) {
        console.log('Admin: Direct Insert', dataToInsert);
        const { error } = await supabase.from('beneficiaires').insert([dataToInsert]);
        if (error) {
          // If RLS or FK issue, it will be in error
          console.error('Supabase Error:', error);
          alert(`ERREUR SYSTEME: ${error.message} (Code: ${error.code})`);
          throw error;
        }
        showNotification('Bénéficiaire ajouté avec succès', 'success');
      } else {
        console.log('User: Pending Action', dataToInsert);
        const { error } = await supabase.from('pending_actions').insert([
          {
            action_type: 'create',
            target_table: 'beneficiaires',
            payload: dataToInsert,
            requested_by: user.id,
          },
        ]);
        if (error) throw error;
        showNotification('Demande transmise pour validation', 'info');
      }
      navigate('/beneficiaires');
    } catch (error: any) {
      console.error('Submit loop error:', error);
      showNotification(`Échec: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ajouter un bénéficiaire</h1>
          <p className="text-muted-foreground">Remplissez les informations de la personne formée</p>
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
              placeholder="Ex: Jean RAKOTO"
            />
          </div>

          <Input
            label="Fonction"
            name="fonction"
            value={formData.fonction}
            onChange={handleChange}
            placeholder="Ex: AGENT COMMUNAUTAIRE..."
            required
          />

          <Input
            label="Numéro CIN"
            name="num_cin"
            value={formData.num_cin}
            onChange={handleChange}
            placeholder="Ex: 100.100.100.100"
            maxLength={15}
          />

          <Input
            label="Numéro Mobile Money"
            name="num_mobile_money"
            value={formData.num_mobile_money}
            onChange={handleChange}
            placeholder="Ex: 034 00 000 00"
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
            placeholder="Ex: Analamanga"
          />

          <Input
            label="District"
            name="district"
            value={formData.district}
            onChange={handleChange}
            required
            placeholder="Ex: Antananarivo Renivohitra"
          />
        </div>

        <div className="pt-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" leftIcon={<Save size={18} />} isLoading={loading}>
            Enregistrer
          </Button>
        </div>
      </motion.form>
    </div>
  );
};
