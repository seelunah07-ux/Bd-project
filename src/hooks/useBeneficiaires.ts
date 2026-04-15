import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Beneficiaire } from '../types';
import { useNotification } from '../contexts/NotificationContext';

export const useBeneficiaires = () => {
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  const fetchBeneficiaires = useCallback(async () => {
    try {
      console.log('--- Fetching Beneficiaires ---');
      setLoading(true);
      const { data, error } = await supabase
        .from('beneficiaires')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }
      
      console.log('Beneficiaires fetched:', data?.length || 0, 'rows');
      if (data && data.length > 0) {
        console.log('Sample data:', data[0]);
      }
      
      setBeneficiaires(data || []);
    } catch (error: any) {
      console.error('Error fetching beneficiaires:', error);
      showNotification('Erreur lors du chargement des bénéficiaires', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBeneficiaires();

    // Subscribe to changes
    const subscription = supabase
      .channel('beneficiaires_changes')
      .on('postgres_changes' as any, { event: '*', table: 'beneficiaires' }, () => {
        console.log('Realtime update detected in beneficiaires');
        fetchBeneficiaires();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchBeneficiaires]);

  return { beneficiaires, loading, refresh: fetchBeneficiaires };
};
