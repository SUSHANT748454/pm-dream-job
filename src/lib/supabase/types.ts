/**
 * Row shapes for the tables this app reads/writes. Kept in sync with
 * `supabase/schema.sql` by hand. The Supabase client itself is untyped — these
 * are used only to map query results in the store modules.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  hear_about: string | null;
  experience_years: string | null;
  current_designation: string | null;
  resume_name: string | null;
  updated_at: string;
}

export interface ResumeRow {
  user_id: string;
  text: string;
  file_name: string | null;
  source: string | null;
  chars: number | null;
  updated_at: string;
}

export interface ApplicationRow {
  user_id: string;
  job_id: string;
  slug: string | null;
  title: string | null;
  company: string | null;
  company_id: string | null;
  location: string | null;
  apply_url: string | null;
  source: string | null;
  stage: string;
  note: string | null;
  added_at: string | null;
  applied_at: string | null;
  updated_at: string;
}
