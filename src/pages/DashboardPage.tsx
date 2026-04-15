import React from 'react';
import { useBeneficiaires } from '../hooks/useBeneficiaires';
import { StatCard } from '../components/dashboard/StatCard';
import { Users, Clock, MapPin, GraduationCap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'motion/react';

export const DashboardPage: React.FC = () => {
  const { beneficiaires, loading } = useBeneficiaires();

  // Calculate stats
  const total = beneficiaires?.length || 0;

  const regionData = (beneficiaires || []).reduce((acc: any, b) => {
    if (b && b.region) {
      acc[b.region] = (acc[b.region] || 0) + 1;
    }
    return acc;
  }, {});

  const chartData = Object.entries(regionData).map(([name, value]) => ({
    name,
    value,
  })).sort((a: any, b: any) => b.value - a.value).slice(0, 12);

  const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Aperçu global des formations et bénéficiaires</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bénéficiaires"
          value={total.toString()}
          icon={Users}
          trend="Inscrit"
          variant="primary"
        />
        <StatCard
          title="En attente"
          value="0"
          icon={Clock}
          trend="Validation requise"
          variant="warning"
        />
        <StatCard
          title="Régions couvertes"
          value={Object.keys(regionData).length.toString()}
          icon={MapPin}
          variant="success"
        />
        <StatCard
          title="Type de fonctions"
          value="14"
          icon={GraduationCap}
          variant="info"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface p-6 rounded-xl border border-border shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-6">Répartition par Région</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
