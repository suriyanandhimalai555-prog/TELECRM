export type UserRole = 'master_admin' | 'company_admin' | 'employee';
export interface AuthUser {
  id: number; email: string; name: string; role: UserRole;
  company_id: number | null; company_name?: string; token: string;
}
export interface Company { id: number; company_name: string; }
export interface WhatsAppAccount {
  id: number; company_id: number; label: string;
  phone_number: string; phone_number_id: string;
  access_token: string; status: 'connected' | 'inactive' | 'warning';
}
