export interface OrgForm {
  name: string;
  description: string;
  subscription_plan: string;
}

export interface EstForm {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  siret: string;
  no_tva: string;
  fiscal_year_start_month: string;
  fiscal_year_start_day: string;
}

export interface VatRow {
  name: string;
  value: string;
  checked: boolean;
}

export interface LeadInfo {
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  website: string | null;
}
