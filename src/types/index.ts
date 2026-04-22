export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  reporting_to?: number;
  assigned_projects?: number[];
  client_key?: string;
  gemini_key?: string;
  front_key?: string;
  backend_key?: string;
  whatsapp_token?: string;
  whatsapp_phone_id?: string;
  whatsapp_waba_id?: string;
  created_at: string;
}

export interface Lead {
  id: number;
  owner_id: number;
  owner_name?: string;
  project_id?: number;
  project_name?: string;
  contact_name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  source: string;
  stage: 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'HOT' | 'ALL_ACTIVE' | 'RECENTLY_WON' | 'LOST';
  revenue: number;
  next_followup?: string;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: number;
  agent_id: number;
  agent_name?: string;
  lead_id?: number;
  lead_name?: string;
  caller: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  type: 'INCOMING' | 'OUTGOING' | 'MISSED';
  campaign_id?: number;
  campaign_name?: string;
  status: 'CONNECTED' | 'BUSY' | 'NO_ANSWER' | 'FAILED';
  feedback?: string;
  notes?: string;
  outcome?: 'LEAD_GENERATED' | 'SALE_CLOSED' | 'FOLLOW_UP_REQUIRED' | 'QUALIFIED' | 'NOT_INTERESTED';
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  user_name?: string;
  lead_id: number;
  lead_name?: string;
  lead_mobile?: string;
  project_id?: number;
  project_name?: string;
  type: 'CALL' | 'MEETING' | 'FOLLOW_UP' | 'EMAIL' | 'WHATSAPP';
  status: 'OPEN' | 'OVERDUE' | 'CLOSED';
  due_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  type: 'COLD_CALLING' | 'FOLLOW_UP' | 'PROMOTIONAL' | 'SURVEY';
  phone_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  lead_count?: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  user_name?: string;
  lead_id?: number;
  lead_name?: string;
  content: string;
  type: 'WHATSAPP' | 'FOLLOW_UP';
  created_at: string;
}

export interface Message {
  id: number;
  message_id: string;
  from_number: string;
  to_number: string;
  message_text: string;
  direction: 'inbound' | 'outbound';
  status: string;
  contact_name: string;
  timestamp: string;
}

export interface DashboardStats {
  totalCalls: number;
  connectedCalls: number;
  notConnectedCalls: number;
  whatsappInteractions: number;
  callTypeBreakdown: { type: string; count: number }[];
  totalDuration: number;
  avgDuration: number;
  recentCalls: Call[];
  dailyTasks: number;
}
