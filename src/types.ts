export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Beneficiaire {
  id: string;
  region: string;
  district: string;
  nom_prenoms: string;
  fonction: string;
  num_cin: string | null;
  num_mobile_money: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ActionType = 'create' | 'update' | 'delete';
export type ActionStatus = 'pending' | 'approved' | 'rejected';

export interface PendingAction {
  id: string;
  action_type: ActionType;
  target_table: string;
  target_id: string | null;
  payload: any;
  status: ActionStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  comment: string | null;
  created_at: string;
  // Joined data
  requester_name?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  performed_by: string;
  created_at: string;
  // Joined data
  performer_name?: string;
}

export interface DashboardStats {
  totalBeneficiaires: number;
  pendingActions: number;
  regionDistribution: { name: string; value: number }[];
}
