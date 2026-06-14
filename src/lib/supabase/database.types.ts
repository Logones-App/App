export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          action_type: string
          created_at: string | null
          deleted: boolean | null
          display_name: string
          establishment_id: string
          id: string
          is_system_action: boolean | null
          name: string
          organization_id: string
          parameters: Json | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          deleted?: boolean | null
          display_name: string
          establishment_id: string
          id?: string
          is_system_action?: boolean | null
          name: string
          organization_id: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          deleted?: boolean | null
          display_name?: string
          establishment_id?: string
          id?: string
          is_system_action?: boolean | null
          name?: string
          organization_id?: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_exceptions: {
        Row: {
          booking_slot_id: string | null
          closed_slots: number[] | null
          created_at: string | null
          created_by: string | null
          date: string | null
          deleted: boolean | null
          description: string | null
          end_date: string | null
          establishment_id: string
          exception_type: string
          id: string
          organization_id: string
          reason: string | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          booking_slot_id?: string | null
          closed_slots?: number[] | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          deleted?: boolean | null
          description?: string | null
          end_date?: string | null
          establishment_id: string
          exception_type: string
          id?: string
          organization_id: string
          reason?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          booking_slot_id?: string | null
          closed_slots?: number[] | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          deleted?: boolean | null
          description?: string | null
          end_date?: string | null
          establishment_id?: string
          exception_type?: string
          id?: string
          organization_id?: string
          reason?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_slots: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_of_week: number
          default_duration_minutes: number
          deleted: boolean | null
          display_order: number | null
          end_time: string
          establishment_id: string
          id: string
          is_active: boolean | null
          max_capacity: number | null
          organization_id: string
          slot_name: string
          start_time: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          default_duration_minutes?: number
          deleted?: boolean | null
          display_order?: number | null
          end_time: string
          establishment_id: string
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          organization_id: string
          slot_name: string
          start_time: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          default_duration_minutes?: number
          deleted?: boolean | null
          display_order?: number | null
          end_time?: string
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          organization_id?: string
          slot_name?: string
          start_time?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_table_allocations: {
        Row: {
          booking_id: string
          created_at: string | null
          deleted: boolean
          end_datetime: string
          establishment_id: string
          id: string
          organization_id: string
          room_id: string | null
          start_datetime: string
          table_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          deleted?: boolean
          end_datetime: string
          establishment_id: string
          id?: string
          organization_id: string
          room_id?: string | null
          start_datetime: string
          table_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          deleted?: boolean
          end_datetime?: string
          establishment_id?: string
          id?: string
          organization_id?: string
          room_id?: string | null
          start_datetime?: string
          table_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_table_allocations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_table_allocations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_table_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_table_allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_table_allocations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_slot_id: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          date: string
          deleted: boolean | null
          end_time: string
          establishment_id: string
          id: string
          number_of_guests: number
          organization_id: string
          service_name: string
          special_requests: string | null
          start_time: string
          status: string
          time: string
          updated_at: string | null
        }
        Insert: {
          booking_slot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          date: string
          deleted?: boolean | null
          end_time?: string
          establishment_id: string
          id?: string
          number_of_guests: number
          organization_id: string
          service_name: string
          special_requests?: string | null
          start_time?: string
          status?: string
          time: string
          updated_at?: string | null
        }
        Update: {
          booking_slot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string
          customer_first_name?: string
          customer_last_name?: string
          customer_phone?: string
          date?: string
          deleted?: boolean | null
          end_time?: string
          establishment_id?: string
          id?: string
          number_of_guests?: number
          organization_id?: string
          service_name?: string
          special_requests?: string | null
          start_time?: string
          status?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_slot_id_fkey"
            columns: ["booking_slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_withdrawals: {
        Row: {
          amount: number
          created_at: string
          daily_found_id: string
          deleted: boolean
          establishment_id: string
          id: string
          organization_id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          daily_found_id: string
          deleted?: boolean
          establishment_id: string
          id?: string
          organization_id: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_found_id?: string
          deleted?: boolean
          establishment_id?: string
          id?: string
          organization_id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_withdrawals_daily_found_id_fkey"
            columns: ["daily_found_id"]
            isOneToOne: false
            referencedRelation: "daily_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          name: string
          organization_id: string | null
          printer_id: string | null
          updated_at: string | null
          vat_rate_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          name: string
          organization_id?: string | null
          printer_id?: string | null
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          name?: string
          organization_id?: string | null
          printer_id?: string | null
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rate"
            referencedColumns: ["id"]
          },
        ]
      }
      category_grid_items: {
        Row: {
          action: Json | null
          background_color: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          display_order: number
          establishment_id: string
          formula_id: string | null
          grid_column: number
          grid_row: number
          icon_url: string | null
          id: string
          is_visible: boolean
          item_type: string
          label: string | null
          menu_id: string | null
          organization_id: string
          parent_item_id: string | null
          product_id: string | null
          text_color: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: Json | null
          background_color?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          display_order?: number
          establishment_id: string
          formula_id?: string | null
          grid_column?: number
          grid_row?: number
          icon_url?: string | null
          id?: string
          is_visible?: boolean
          item_type?: string
          label?: string | null
          menu_id?: string | null
          organization_id: string
          parent_item_id?: string | null
          product_id?: string | null
          text_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: Json | null
          background_color?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          display_order?: number
          establishment_id?: string
          formula_id?: string | null
          grid_column?: number
          grid_row?: number
          icon_url?: string | null
          id?: string
          is_visible?: boolean
          item_type?: string
          label?: string | null
          menu_id?: string | null
          organization_id?: string
          parent_item_id?: string | null
          product_id?: string | null
          text_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_grid_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "category_grid_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_commercial_objectives: {
        Row: {
          achieved_amount: number
          created_at: string
          id: string
          month: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_amount?: number
          created_at?: string
          id?: string
          month: string
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_amount?: number
          created_at?: string
          id?: string
          month?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_onboarding_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          org_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_onboarding_checklists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_onboarding_steps: {
        Row: {
          checklist_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          label: string
          position: number
        }
        Insert: {
          checklist_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          checklist_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_onboarding_steps_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "crm_onboarding_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pre_invoice_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          label: string
          paid_at: string | null
          pre_invoice_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          label: string
          paid_at?: string | null
          pre_invoice_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          label?: string
          paid_at?: string | null
          pre_invoice_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pre_invoice_installments_pre_invoice_id_fkey"
            columns: ["pre_invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_pre_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pre_invoices: {
        Row: {
          commitment_months: number
          created_at: string
          created_by: string | null
          deleted: boolean
          deposit_amount: number | null
          id: string
          lead_id: string | null
          mrr: number
          notes: string | null
          org_id: string | null
          pre_invoice_number: string
          quote_id: string | null
          status: string
          total_ht: number
          total_ttc: number
          updated_at: string
        }
        Insert: {
          commitment_months?: number
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deposit_amount?: number | null
          id?: string
          lead_id?: string | null
          mrr?: number
          notes?: string | null
          org_id?: string | null
          pre_invoice_number?: string
          quote_id?: string | null
          status?: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
        }
        Update: {
          commitment_months?: number
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deposit_amount?: number | null
          id?: string
          lead_id?: string | null
          mrr?: number
          notes?: string | null
          org_id?: string | null
          pre_invoice_number?: string
          quote_id?: string | null
          status?: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pre_invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pre_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pre_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_products: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deleted: boolean
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_type: string
          purchase_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_type?: string
          purchase_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_type?: string
          purchase_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_quote_items: {
        Row: {
          created_at: string
          designation: string
          id: string
          position: number
          price_type: string
          product_id: string | null
          purchase_price: number
          quantity: number
          quote_id: string
          total_ht: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          designation: string
          id?: string
          position?: number
          price_type?: string
          product_id?: string | null
          purchase_price?: number
          quantity?: number
          quote_id: string
          total_ht?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          designation?: string
          id?: string
          position?: number
          price_type?: string
          product_id?: string | null
          purchase_price?: number
          quantity?: number
          quote_id?: string
          total_ht?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean
          deposit_amount: number | null
          id: string
          lead_id: string | null
          notes: string | null
          org_id: string | null
          pennylane_quote_id: string | null
          quote_number: string
          sent_at: string | null
          signed_at: string | null
          status: string
          total_ht: number
          total_ttc: number
          total_tva: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deposit_amount?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id?: string | null
          pennylane_quote_id?: string | null
          quote_number?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deposit_amount?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id?: string | null
          pennylane_quote_id?: string | null
          quote_number?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_subscriptions: {
        Row: {
          amount_monthly: number
          commitment_months: number
          created_at: string
          created_by: string | null
          deleted: boolean
          id: string
          name: string
          next_billing_date: string | null
          notes: string | null
          org_id: string
          product_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_monthly?: number
          commitment_months?: number
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          name: string
          next_billing_date?: string | null
          notes?: string | null
          org_id: string
          product_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_monthly?: number
          commitment_months?: number
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          org_id?: string
          product_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "crm_products"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          domain: string
          establishment_id: string
          establishment_slug: string
          id: string
          is_active: boolean
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          domain: string
          establishment_id: string
          establishment_slug: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          domain?: string
          establishment_id?: string
          establishment_slug?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_found: {
        Row: {
          closed_at_at: string | null
          closing_cash_count: number | null
          closing_cash_to_keep: number | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          opened: boolean | null
          opened_at: string | null
          opening_cash_amount: number | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at_at?: string | null
          closing_cash_count?: number | null
          closing_cash_to_keep?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          opening_cash_amount?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at_at?: string | null
          closing_cash_count?: number | null
          closing_cash_to_keep?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          opening_cash_amount?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_found_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          created_at: string | null
          device_id: string
          employee_id: string
          establishment_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          orga_user_id: string
          organization_id: string
          session_data: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          employee_id: string
          establishment_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          orga_user_id: string
          organization_id: string
          session_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          employee_id?: string
          establishment_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          orga_user_id?: string
          organization_id?: string
          session_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sessions_mobile_user_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          device_info: Json | null
          device_role: string
          display: string
          establishment_id: string | null
          establishment_name: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          manufacturer: string | null
          model: string | null
          mods: string[]
          organization_id: string | null
          port_attribue: number | null
          serial_number: string
          software_version: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          device_info?: Json | null
          device_role?: string
          display?: string
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          manufacturer?: string | null
          model?: string | null
          mods?: string[]
          organization_id?: string | null
          port_attribue?: number | null
          serial_number: string
          software_version?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          device_info?: Json | null
          device_role?: string
          display?: string
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          manufacturer?: string | null
          model?: string | null
          mods?: string[]
          organization_id?: string | null
          port_attribue?: number | null
          serial_number?: string
          software_version?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_import_corrections: {
        Row: {
          corrected_at: string
          corrected_by: string | null
          corrected_value: string | null
          field_name: string | null
          id: string
          import_id: string
          original_value: string | null
        }
        Insert: {
          corrected_at?: string
          corrected_by?: string | null
          corrected_value?: string | null
          field_name?: string | null
          id?: string
          import_id: string
          original_value?: string | null
        }
        Update: {
          corrected_at?: string
          corrected_by?: string | null
          corrected_value?: string | null
          field_name?: string | null
          id?: string
          import_id?: string
          original_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_import_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_import_corrections_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "doc_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_import_lines: {
        Row: {
          applied_at: string | null
          apply_price: boolean
          apply_stock: boolean
          automation_note: string | null
          automation_status: string | null
          contenance_unitaire: number | null
          designation: string | null
          id: string
          import_id: string
          prix_unitaire: number | null
          product_id: string | null
          product_supplier_id: string | null
          quantite: number | null
          reference: string | null
          total_ht: number | null
          unite: string | null
          unite_contenance: string | null
        }
        Insert: {
          applied_at?: string | null
          apply_price?: boolean
          apply_stock?: boolean
          automation_note?: string | null
          automation_status?: string | null
          contenance_unitaire?: number | null
          designation?: string | null
          id?: string
          import_id: string
          prix_unitaire?: number | null
          product_id?: string | null
          product_supplier_id?: string | null
          quantite?: number | null
          reference?: string | null
          total_ht?: number | null
          unite?: string | null
          unite_contenance?: string | null
        }
        Update: {
          applied_at?: string | null
          apply_price?: boolean
          apply_stock?: boolean
          automation_note?: string | null
          automation_status?: string | null
          contenance_unitaire?: number | null
          designation?: string | null
          id?: string
          import_id?: string
          prix_unitaire?: number | null
          product_id?: string | null
          product_supplier_id?: string | null
          quantite?: number | null
          reference?: string | null
          total_ht?: number | null
          unite?: string | null
          unite_contenance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_import_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "doc_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_import_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_import_lines_product_supplier_id_fkey"
            columns: ["product_supplier_id"]
            isOneToOne: false
            referencedRelation: "product_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_import_usage: {
        Row: {
          doc_count: number
          month: string
          organization_id: string
        }
        Insert: {
          doc_count?: number
          month: string
          organization_id: string
        }
        Update: {
          doc_count?: number
          month?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_import_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_imports: {
        Row: {
          automation_applied_at: string | null
          automation_error: string | null
          consensus_json: Json | null
          created_at: string
          date_echeance: string | null
          date_livraison: string | null
          doc_type: string | null
          document_date: string | null
          establishment_id: string
          extracted_azure: Json | null
          extracted_llm: Json | null
          id: string
          image_hash: string | null
          numero_document: string | null
          organization_id: string
          pennylane_id: string | null
          source_type: string | null
          source_url: string | null
          status: string
          supplier_id: string | null
          total_ht: number | null
          total_ttc: number | null
          tva_details: Json | null
          validated_at: string | null
          validated_by: string | null
          validated_json: Json | null
          validation_error: string | null
        }
        Insert: {
          automation_applied_at?: string | null
          automation_error?: string | null
          consensus_json?: Json | null
          created_at?: string
          date_echeance?: string | null
          date_livraison?: string | null
          doc_type?: string | null
          document_date?: string | null
          establishment_id: string
          extracted_azure?: Json | null
          extracted_llm?: Json | null
          id?: string
          image_hash?: string | null
          numero_document?: string | null
          organization_id: string
          pennylane_id?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          supplier_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          tva_details?: Json | null
          validated_at?: string | null
          validated_by?: string | null
          validated_json?: Json | null
          validation_error?: string | null
        }
        Update: {
          automation_applied_at?: string | null
          automation_error?: string | null
          consensus_json?: Json | null
          created_at?: string
          date_echeance?: string | null
          date_livraison?: string | null
          doc_type?: string | null
          document_date?: string | null
          establishment_id?: string
          extracted_azure?: Json | null
          extracted_llm?: Json | null
          id?: string
          image_hash?: string | null
          numero_document?: string | null
          organization_id?: string
          pennylane_id?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          supplier_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          tva_details?: Json | null
          validated_at?: string | null
          validated_by?: string | null
          validated_json?: Json | null
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_imports_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_imports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_imports_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          organization_id: string | null
          recipient_email: string
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          recipient_email: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          recipient_email?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_absences: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean
          employee_id: string
          end_date: string
          establishment_id: string | null
          has_document: boolean
          id: string
          notes: string | null
          organization_id: string
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          employee_id: string
          end_date: string
          establishment_id?: string | null
          has_document?: boolean
          id?: string
          notes?: string | null
          organization_id: string
          start_date: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          employee_id?: string
          end_date?: string
          establishment_id?: string | null
          has_document?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_absences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean
          document_type: string
          employee_id: string
          expires_at: string | null
          file_path: string
          id: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          document_type: string
          employee_id: string
          expires_at?: string | null
          file_path: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          document_type?: string
          employee_id?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_module_access: {
        Row: {
          created_at: string
          deleted: boolean
          employee_id: string
          establishment_id: string | null
          id: string
          module: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          employee_id: string
          establishment_id?: string | null
          id?: string
          module: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          employee_id?: string
          establishment_id?: string | null
          id?: string
          module?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_module_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_module_access_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_module_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_monthly_reports: {
        Row: {
          advance_payment: number | null
          bonus_gross: number | null
          bonus_net: number | null
          comments: string | null
          created_at: string
          created_by: string | null
          deleted: boolean
          employee_id: string
          establishment_id: string | null
          exit_mid_month_date: string | null
          expense_claims: number | null
          hire_mid_month_date: string | null
          id: string
          meal_vouchers_count: number | null
          month: number
          organization_id: string
          other_notes: string | null
          overtime_week_1: number | null
          overtime_week_2: number | null
          overtime_week_3: number | null
          overtime_week_4: number | null
          overtime_week_5: number | null
          transport_subsidy: number | null
          updated_at: string
          year: number
        }
        Insert: {
          advance_payment?: number | null
          bonus_gross?: number | null
          bonus_net?: number | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          employee_id: string
          establishment_id?: string | null
          exit_mid_month_date?: string | null
          expense_claims?: number | null
          hire_mid_month_date?: string | null
          id?: string
          meal_vouchers_count?: number | null
          month: number
          organization_id: string
          other_notes?: string | null
          overtime_week_1?: number | null
          overtime_week_2?: number | null
          overtime_week_3?: number | null
          overtime_week_4?: number | null
          overtime_week_5?: number | null
          transport_subsidy?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          advance_payment?: number | null
          bonus_gross?: number | null
          bonus_net?: number | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          employee_id?: string
          establishment_id?: string | null
          exit_mid_month_date?: string | null
          expense_claims?: number | null
          hire_mid_month_date?: string | null
          id?: string
          meal_vouchers_count?: number | null
          month?: number
          organization_id?: string
          other_notes?: string | null
          overtime_week_1?: number | null
          overtime_week_2?: number | null
          overtime_week_3?: number | null
          overtime_week_4?: number | null
          overtime_week_5?: number | null
          transport_subsidy?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_monthly_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_monthly_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_monthly_reports_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_monthly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          employee_id: string | null
          establishment_id: string | null
          granted_at: string | null
          granted_by: string | null
          granted_by_employee_id: string | null
          id: string
          organization_id: string | null
          permission: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          employee_id?: string | null
          establishment_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          granted_by_employee_id?: string | null
          id?: string
          organization_id?: string | null
          permission: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          employee_id?: string | null
          establishment_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          granted_by_employee_id?: string | null
          id?: string
          organization_id?: string | null
          permission?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_granted_by_employee_id_fkey"
            columns: ["granted_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_user_permissions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_user_permissions_mobile_user_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_user_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_overrides: {
        Row: {
          created_at: string
          deleted: boolean
          employee_id: string | null
          end_hour: number | null
          establishment_id: string
          id: string
          label: string | null
          organization_id: string
          override_date: string
          parent_shift_id: string
          start_hour: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          employee_id?: string | null
          end_hour?: number | null
          establishment_id: string
          id?: string
          label?: string | null
          organization_id: string
          override_date: string
          parent_shift_id: string
          start_hour?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          employee_id?: string | null
          end_hour?: number | null
          establishment_id?: string
          id?: string
          label?: string | null
          organization_id?: string
          override_date?: string
          parent_shift_id?: string
          start_hour?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_overrides_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_overrides_parent_shift_id_fkey"
            columns: ["parent_shift_id"]
            isOneToOne: false
            referencedRelation: "employee_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_templates: {
        Row: {
          color: string | null
          created_at: string
          deleted: boolean
          end_hour: number
          end_minute: number
          establishment_id: string
          id: string
          label: string
          organization_id: string
          start_hour: number
          start_minute: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted?: boolean
          end_hour: number
          end_minute?: number
          establishment_id: string
          id?: string
          label: string
          organization_id: string
          start_hour: number
          start_minute?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted?: boolean
          end_hour?: number
          end_minute?: number
          establishment_id?: string
          id?: string
          label?: string
          organization_id?: string
          start_hour?: number
          start_minute?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_templates_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string
          deleted: boolean
          employee_id: string
          employee_shift_template_id: string | null
          end_hour: number
          end_minute: number
          establishment_id: string
          excluded_dates: string[]
          id: string
          is_recurring: boolean
          label: string | null
          organization_id: string
          overnight: boolean
          recurrence_days: number[] | null
          start_hour: number
          start_minute: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start: string
          deleted?: boolean
          employee_id: string
          employee_shift_template_id?: string | null
          end_hour: number
          end_minute?: number
          establishment_id: string
          excluded_dates?: string[]
          id?: string
          is_recurring?: boolean
          label?: string | null
          organization_id: string
          overnight?: boolean
          recurrence_days?: number[] | null
          start_hour: number
          start_minute?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string
          deleted?: boolean
          employee_id?: string
          employee_shift_template_id?: string | null
          end_hour?: number
          end_minute?: number
          establishment_id?: string
          excluded_dates?: string[]
          id?: string
          is_recurring?: boolean
          label?: string | null
          organization_id?: string
          overnight?: boolean
          recurrence_days?: number[] | null
          start_hour?: number
          start_minute?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_employee_shift_template_id_fkey"
            columns: ["employee_shift_template_id"]
            isOneToOne: false
            referencedRelation: "employee_shift_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_user_id: string | null
          birth_city: string | null
          birth_date: string | null
          birth_department: string | null
          contract_type: string | null
          created_at: string | null
          deleted: boolean | null
          email: string | null
          establishment_id: string | null
          exit_date: string | null
          firstname: string
          gender: string | null
          gross_salary: number | null
          has_mobile_access: boolean
          hire_datetime: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          lastname: string
          nationality: string | null
          net_salary: number | null
          nia_number: string | null
          organization_id: string
          phone: string | null
          pin_code: string | null
          qualification: string | null
          role: string | null
          social_security_number: string | null
          temp_agency_address: string | null
          temp_agency_name: string | null
          updated_at: string | null
          work_permit_date: string | null
          work_permit_number: string | null
          work_permit_type: string | null
        }
        Insert: {
          auth_user_id?: string | null
          birth_city?: string | null
          birth_date?: string | null
          birth_department?: string | null
          contract_type?: string | null
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          establishment_id?: string | null
          exit_date?: string | null
          firstname: string
          gender?: string | null
          gross_salary?: number | null
          has_mobile_access?: boolean
          hire_datetime?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          lastname: string
          nationality?: string | null
          net_salary?: number | null
          nia_number?: string | null
          organization_id: string
          phone?: string | null
          pin_code?: string | null
          qualification?: string | null
          role?: string | null
          social_security_number?: string | null
          temp_agency_address?: string | null
          temp_agency_name?: string | null
          updated_at?: string | null
          work_permit_date?: string | null
          work_permit_number?: string | null
          work_permit_type?: string | null
        }
        Update: {
          auth_user_id?: string | null
          birth_city?: string | null
          birth_date?: string | null
          birth_department?: string | null
          contract_type?: string | null
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          establishment_id?: string | null
          exit_date?: string | null
          firstname?: string
          gender?: string | null
          gross_salary?: number | null
          has_mobile_access?: boolean
          hire_datetime?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          lastname?: string
          nationality?: string | null
          net_salary?: number | null
          nia_number?: string | null
          organization_id?: string
          phone?: string | null
          pin_code?: string | null
          qualification?: string | null
          role?: string | null
          social_security_number?: string | null
          temp_agency_address?: string | null
          temp_agency_name?: string | null
          updated_at?: string | null
          work_permit_date?: string | null
          work_permit_number?: string | null
          work_permit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_documents: {
        Row: {
          created_at: string
          deleted: boolean
          document_type: string
          establishment_id: string
          file_path: string
          id: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          document_type: string
          establishment_id: string
          file_path: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted?: boolean
          document_type?: string
          establishment_id?: string
          file_path?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "establishment_documents_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_gallery: {
        Row: {
          alt_text: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          dimensions: Json | null
          display_order: number | null
          establishment_id: string
          file_size: number | null
          id: string
          image_description: string | null
          image_name: string | null
          image_url: string
          is_featured: boolean | null
          is_public: boolean | null
          mime_type: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          dimensions?: Json | null
          display_order?: number | null
          establishment_id: string
          file_size?: number | null
          id?: string
          image_description?: string | null
          image_name?: string | null
          image_url: string
          is_featured?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          dimensions?: Json | null
          display_order?: number | null
          establishment_id?: string
          file_size?: number | null
          id?: string
          image_description?: string | null
          image_name?: string | null
          image_url?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_gallery_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_gallery_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_gallery_sections: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          display_order: number
          establishment_id: string
          id: string
          image_id: string
          organization_id: string
          section: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number
          establishment_id: string
          id?: string
          image_id: string
          organization_id: string
          section: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number
          establishment_id?: string
          id?: string
          image_id?: string
          organization_id?: string
          section?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_gallery_sections_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_gallery_sections_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "establishment_gallery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_gallery_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_modules: {
        Row: {
          created_at: string
          deleted: boolean
          enabled: boolean
          establishment_id: string | null
          id: string
          module: string
          organization_id: string
          seats: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          enabled?: boolean
          establishment_id?: string | null
          id?: string
          module: string
          organization_id: string
          seats?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          enabled?: boolean
          establishment_id?: string | null
          id?: string
          module?: string
          organization_id?: string
          seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_modules_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          city: string | null
          code_naf: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          email: string | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          name: string
          no_tva: string | null
          organization_id: string
          phone: string | null
          postal_code: number | null
          printer_id: string | null
          seo_description: string | null
          seo_title: string | null
          siret: string | null
          slug: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code_naf?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          email?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          no_tva?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: number | null
          printer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          siret?: string | null
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code_naf?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          email?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          no_tva?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: number | null
          printer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          siret?: string | null
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishments_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_products: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          display_order: number | null
          establishment_id: string
          formula_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          organization_id: string
          product_id: string
          slot_id: string
          supplement_price: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number | null
          establishment_id: string
          formula_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          organization_id: string
          product_id: string
          slot_id: string
          supplement_price?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number | null
          establishment_id?: string
          formula_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          organization_id?: string
          product_id?: string
          slot_id?: string
          supplement_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "formula_products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_products_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_products_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "formula_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_slots: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          establishment_id: string
          formula_id: string
          id: string
          name: string
          organization_id: string
          slot_order: number
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id: string
          formula_id: string
          id?: string
          name?: string
          organization_id: string
          slot_order: number
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id?: string
          formula_id?: string
          id?: string
          name?: string
          organization_id?: string
          slot_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "formula_slots_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_slots_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      formulas: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          description: string | null
          display_order: number | null
          establishment_id: string | null
          id: string
          is_active: boolean | null
          menu_id: string
          name: string
          organization_id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          menu_id: string
          name: string
          organization_id: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          menu_id?: string
          name?: string
          organization_id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formulas_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulas_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          brevo_message_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          duration_minutes: number | null
          email_subject: string | null
          email_to: string | null
          id: string
          lead_id: string
          meeting_url: string | null
          title: string | null
          type: string
        }
        Insert: {
          brevo_message_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          duration_minutes?: number | null
          email_subject?: string | null
          email_to?: string | null
          id?: string
          lead_id: string
          meeting_url?: string | null
          title?: string | null
          type: string
        }
        Update: {
          brevo_message_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          duration_minutes?: number | null
          email_subject?: string | null
          email_to?: string | null
          id?: string
          lead_id?: string
          meeting_url?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean | null
          last_name: string
          lead_id: string
          phone: string | null
          position: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name: string
          lead_id: string
          phone?: string | null
          position?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name?: string
          lead_id?: string
          phone?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          due_date: string | null
          id: string
          lead_id: string
          title: string
          type: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          due_date?: string | null
          id?: string
          lead_id: string
          title: string
          type: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          due_date?: string | null
          id?: string
          lead_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          converted_at: string | null
          converted_org_id: string | null
          country: string | null
          covers_per_day: number | null
          created_at: string | null
          created_by: string | null
          current_software: string | null
          deleted: boolean | null
          employees_count: number | null
          id: string
          lost_reason: string | null
          notes: string | null
          pennylane_contact_id: string | null
          photo_url: string | null
          sector: string | null
          source: string
          source_details: string | null
          stage_changed_at: string | null
          status: string
          updated_at: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_org_id?: string | null
          country?: string | null
          covers_per_day?: number | null
          created_at?: string | null
          created_by?: string | null
          current_software?: string | null
          deleted?: boolean | null
          employees_count?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          pennylane_contact_id?: string | null
          photo_url?: string | null
          sector?: string | null
          source?: string
          source_details?: string | null
          stage_changed_at?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_org_id?: string | null
          country?: string | null
          covers_per_day?: number | null
          created_at?: string | null
          created_by?: string | null
          current_software?: string | null
          deleted?: boolean | null
          employees_count?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          pennylane_contact_id?: string | null
          photo_url?: string | null
          sector?: string | null
          source?: string
          source_details?: string | null
          stage_changed_at?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_org_id_fkey"
            columns: ["converted_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          deleted: boolean | null
          end_time: string | null
          id: string
          menu_id: string
          organization_id: string
          start_time: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          deleted?: boolean | null
          end_time?: string | null
          id?: string
          menu_id: string
          organization_id: string
          start_time?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          deleted?: boolean | null
          end_time?: string | null
          id?: string
          menu_id?: string
          organization_id?: string
          start_time?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_schedules_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          display_order: number | null
          establishment_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_public: boolean | null
          name: string | null
          organization_id: string
          pricing_strategy: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string | null
          organization_id: string
          pricing_strategy?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string | null
          organization_id?: string
          pricing_strategy?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_establishments_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menus_products: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          menus_id: string | null
          organization_id: string
          price: number | null
          products_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          menus_id?: string | null
          organization_id: string
          price?: number | null
          products_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          menus_id?: string | null
          organization_id?: string
          price?: number | null
          products_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_products_menus_id_fkey"
            columns: ["menus_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_products_products_id_fkey"
            columns: ["products_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      menus_products_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          id: string
          menus_products_id: string
          notes: string | null
          sale_price: number
          source: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          id?: string
          menus_products_id: string
          notes?: string | null
          sale_price: number
          source?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          id?: string
          menus_products_id?: string
          notes?: string | null
          sale_price?: number
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_products_price_history_menus_products_id_fkey"
            columns: ["menus_products_id"]
            isOneToOne: false
            referencedRelation: "menus_products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          deleted: boolean | null
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_config: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      nf525_jet: {
        Row: {
          code_event: number
          created_at: string | null
          device_id: string | null
          establishment_id: string | null
          event_at: string
          event_id: number
          hash_chain_input: string | null
          id: string
          label: string | null
          operator_code: string | null
          organization_id: string | null
          previous_signature_base64url: string | null
          purgeable: boolean
          report_previous_signature: string | null
          signature_base64url: string | null
        }
        Insert: {
          code_event: number
          created_at?: string | null
          device_id?: string | null
          establishment_id?: string | null
          event_at: string
          event_id: number
          hash_chain_input?: string | null
          id?: string
          label?: string | null
          operator_code?: string | null
          organization_id?: string | null
          previous_signature_base64url?: string | null
          purgeable?: boolean
          report_previous_signature?: string | null
          signature_base64url?: string | null
        }
        Update: {
          code_event?: number
          created_at?: string | null
          device_id?: string | null
          establishment_id?: string | null
          event_at?: string
          event_id?: number
          hash_chain_input?: string | null
          id?: string
          label?: string | null
          operator_code?: string | null
          organization_id?: string | null
          previous_signature_base64url?: string | null
          purgeable?: boolean
          report_previous_signature?: string | null
          signature_base64url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nf525_jet_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_jet_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_jet_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_piece_recap_tva: {
        Row: {
          amount_vat: number
          created_at: string | null
          id: string
          nf525_piece_id: string
          total_ht: number
          vat_rate: number
        }
        Insert: {
          amount_vat: number
          created_at?: string | null
          id?: string
          nf525_piece_id: string
          total_ht: number
          vat_rate: number
        }
        Update: {
          amount_vat?: number
          created_at?: string | null
          id?: string
          nf525_piece_id?: string
          total_ht?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "nf525_piece_recap_tva_nf525_piece_id_fkey"
            columns: ["nf525_piece_id"]
            isOneToOne: false
            referencedRelation: "nf525_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_pieces: {
        Row: {
          created_at: string | null
          device_id: string
          emitter_snapshot: Json | null
          employee_id: string
          establishment_id: string
          hash_chain_input: string | null
          id: string
          line_count: number
          operation_type: string
          order_id: string
          organization_id: string | null
          piece_number: string
          piece_type: string
          previous_signature_base64url: string | null
          print_count: number
          recorded_at: string
          signature_base64url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          emitter_snapshot?: Json | null
          employee_id: string
          establishment_id: string
          hash_chain_input?: string | null
          id?: string
          line_count?: number
          operation_type?: string
          order_id: string
          organization_id?: string | null
          piece_number: string
          piece_type: string
          previous_signature_base64url?: string | null
          print_count?: number
          recorded_at: string
          signature_base64url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          emitter_snapshot?: Json | null
          employee_id?: string
          establishment_id?: string
          hash_chain_input?: string | null
          id?: string
          line_count?: number
          operation_type?: string
          order_id?: string
          organization_id?: string | null
          piece_number?: string
          piece_type?: string
          previous_signature_base64url?: string | null
          print_count?: number
          recorded_at?: string
          signature_base64url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nf525_pieces_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_pieces_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_pieces_mobile_user_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_pieces_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_pieces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_restitutions: {
        Row: {
          amount_ttc: number
          covers: number | null
          created_at: string
          device_id: string
          doc_type: string
          duplicate_of_id: string | null
          establishment_id: string
          id: string
          is_refund_valid: boolean
          nf525_piece_id: string | null
          order_id: string | null
          organization_id: string | null
          payment_id: string | null
          print_index: number
          printed_at: string
          updated_at: string
        }
        Insert: {
          amount_ttc: number
          covers?: number | null
          created_at?: string
          device_id: string
          doc_type: string
          duplicate_of_id?: string | null
          establishment_id: string
          id?: string
          is_refund_valid?: boolean
          nf525_piece_id?: string | null
          order_id?: string | null
          organization_id?: string | null
          payment_id?: string | null
          print_index?: number
          printed_at?: string
          updated_at?: string
        }
        Update: {
          amount_ttc?: number
          covers?: number | null
          created_at?: string
          device_id?: string
          doc_type?: string
          duplicate_of_id?: string | null
          establishment_id?: string
          id?: string
          is_refund_valid?: boolean
          nf525_piece_id?: string | null
          order_id?: string | null
          organization_id?: string | null
          payment_id?: string | null
          print_index?: number
          printed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf525_restitutions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "nf525_restitutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_nf525_piece_id_fkey"
            columns: ["nf525_piece_id"]
            isOneToOne: false
            referencedRelation: "nf525_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_restitutions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_sequences: {
        Row: {
          created_at: string | null
          device_id: string
          establishment_id: string
          id: string
          last_number: number
          organization_id: string | null
          piece_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          establishment_id: string
          id?: string
          last_number?: number
          organization_id?: string | null
          piece_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          establishment_id?: string
          id?: string
          last_number?: number
          organization_id?: string | null
          piece_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nf525_sequences_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_sequences_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nf525_signing_keys: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          organization_id: string
          signing_key_base64: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          organization_id: string
          signing_key_base64: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          organization_id?: string
          signing_key_base64?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nf525_signing_keys_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf525_signing_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours: {
        Row: {
          close_time: string
          created_at: string | null
          created_by: string | null
          day_of_week: number
          deleted: boolean | null
          establishment_id: string
          id: string
          is_active: boolean | null
          name: string | null
          open_time: string
          organization_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          close_time: string
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          deleted?: boolean | null
          establishment_id: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          open_time: string
          organization_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          open_time?: string
          organization_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours_exceptions: {
        Row: {
          closed_hours: number[] | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          exception_date: string
          exception_type: string
          id: string
          modified_close_time: string | null
          modified_open_time: string | null
          organization_id: string | null
          reason: string | null
          service_name: string | null
          slot_status: string | null
          updated_at: string | null
        }
        Insert: {
          closed_hours?: number[] | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          exception_date: string
          exception_type: string
          id?: string
          modified_close_time?: string | null
          modified_open_time?: string | null
          organization_id?: string | null
          reason?: string | null
          service_name?: string | null
          slot_status?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_hours?: number[] | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          exception_date?: string
          exception_type?: string
          id?: string
          modified_close_time?: string | null
          modified_open_time?: string | null
          organization_id?: string | null
          reason?: string | null
          service_name?: string | null
          slot_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_exceptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_formulas: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          establishment_id: string
          formula_id: string
          formula_name: string
          id: string
          order_id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id: string
          formula_id: string
          formula_name: string
          id?: string
          order_id: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id?: string
          formula_id?: string
          formula_name?: string
          id?: string
          order_id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_formulas_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_formulas_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_pools: {
        Row: {
          created_at: string
          deleted: boolean
          establishment_id: string
          id: string
          label: string | null
          n_shares: number
          order_id: string
          organization_id: string
          pool_type: string
          product_keys: Json
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          establishment_id: string
          id?: string
          label?: string | null
          n_shares: number
          order_id: string
          organization_id: string
          pool_type: string
          product_keys?: Json
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          establishment_id?: string
          id?: string
          label?: string | null
          n_shares?: number
          order_id?: string
          organization_id?: string
          pool_type?: string
          product_keys?: Json
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_payment_settlements: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string | null
          created_by: string | null
          deleted: boolean
          establishment_id: string
          extra_amount: number
          extra_type: string | null
          id: string
          orders_payments_id: string
          organization_id: string | null
          payment_method_id: string
          payment_method_name: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean
          establishment_id: string
          extra_amount?: number
          extra_type?: string | null
          id?: string
          orders_payments_id: string
          organization_id?: string | null
          payment_method_id: string
          payment_method_name?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean
          establishment_id?: string
          extra_amount?: number
          extra_type?: string | null
          id?: string
          orders_payments_id?: string
          organization_id?: string | null
          payment_method_id?: string
          payment_method_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_settlements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payment_settlements_orders_payments_id_fkey"
            columns: ["orders_payments_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payment_settlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payment_settlements_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          discount_amount: number
          discount_reason: string | null
          division_state: Json | null
          establishment_id: string
          id: string
          name: string
          order_discount_share: number
          orders_id: string | null
          organization_id: string | null
          paid: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          discount_amount?: number
          discount_reason?: string | null
          division_state?: Json | null
          establishment_id: string
          id?: string
          name: string
          order_discount_share?: number
          orders_id?: string | null
          organization_id?: string | null
          paid?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          discount_amount?: number
          discount_reason?: string | null
          division_state?: Json | null
          establishment_id?: string
          id?: string
          name?: string
          order_discount_share?: number
          orders_id?: string | null
          organization_id?: string | null
          paid?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_payments_order_id_fkey"
            columns: ["orders_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments_rows: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string | null
          id: string
          order_products_id: string | null
          orders_payments_id: string | null
          organization_id: string | null
          payment_type: string | null
          pool_id: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          order_products_id?: string | null
          orders_payments_id?: string | null
          organization_id?: string | null
          payment_type?: string | null
          pool_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          order_products_id?: string | null
          orders_payments_id?: string | null
          organization_id?: string | null
          payment_type?: string | null
          pool_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_rows_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_rows_order_products_id_fkey"
            columns: ["order_products_id"]
            isOneToOne: false
            referencedRelation: "order_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_rows_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "order_payment_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payments_rows_orders_payments_id_fkey"
            columns: ["orders_payments_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payments_rows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_products: {
        Row: {
          cancel_reason: string | null
          cancelled: boolean
          created_at: string
          created_by: string | null
          deleted: boolean
          discount_amount: number
          discount_reason: string | null
          establishment_id: string
          id: string
          kitchen_print_count: number
          kitchen_sent_at: string | null
          late_addition: boolean
          notes: string | null
          order_formulas_id: string | null
          order_id: string
          organization_id: string
          product_compositions: Json | null
          product_description: string | null
          product_id: string | null
          product_name: string
          product_options: Json | null
          quantity: number
          special_instructions: string | null
          suite_id: string | null
          suite_position: number | null
          total_price: number
          unit_price: number
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          discount_amount?: number
          discount_reason?: string | null
          establishment_id: string
          id?: string
          kitchen_print_count?: number
          kitchen_sent_at?: string | null
          late_addition?: boolean
          notes?: string | null
          order_formulas_id?: string | null
          order_id: string
          organization_id: string
          product_compositions?: Json | null
          product_description?: string | null
          product_id?: string | null
          product_name: string
          product_options?: Json | null
          quantity?: number
          special_instructions?: string | null
          suite_id?: string | null
          suite_position?: number | null
          total_price: number
          unit_price: number
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          discount_amount?: number
          discount_reason?: string | null
          establishment_id?: string
          id?: string
          kitchen_print_count?: number
          kitchen_sent_at?: string | null
          late_addition?: boolean
          notes?: string | null
          order_formulas_id?: string | null
          order_id?: string
          organization_id?: string
          product_compositions?: Json | null
          product_description?: string | null
          product_id?: string | null
          product_name?: string
          product_options?: Json | null
          quantity?: number
          special_instructions?: string | null
          suite_id?: string | null
          suite_position?: number | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_products_order_formulas_id_fkey"
            columns: ["order_formulas_id"]
            isOneToOne: false
            referencedRelation: "order_formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_products_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_products_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "order_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          created_at: string
          device_id: string | null
          establishment_id: string
          id: string
          organization_id: string
          original_nf525_piece_signature: string | null
          original_order_id: string
          original_payment_id: string
          reason: string | null
          refund_method: string
          refunded_at: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          device_id?: string | null
          establishment_id: string
          id?: string
          organization_id: string
          original_nf525_piece_signature?: string | null
          original_order_id: string
          original_payment_id: string
          reason?: string | null
          refund_method?: string
          refunded_at?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          device_id?: string | null
          establishment_id?: string
          id?: string
          organization_id?: string
          original_nf525_piece_signature?: string | null
          original_order_id?: string
          original_payment_id?: string
          reason?: string | null
          refund_method?: string
          refunded_at?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_suites: {
        Row: {
          created_at: string | null
          custom_name: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          is_active: boolean | null
          kds_status: string
          order: number
          order_id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          is_active?: boolean | null
          kds_status?: string
          order?: number
          order_id: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          kds_status?: string
          order?: number
          order_id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_suites_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_suites_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_suites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          covers: number
          created_at: string | null
          created_by: string | null
          daily_found_id: string | null
          deleted: boolean | null
          description: string | null
          discount_amount: number
          discount_reason: string | null
          establishment_id: string
          id: string
          kds_status: string
          opened: boolean | null
          organization_id: string | null
          server_id: string
          tables_id: string | null
          updated_at: string | null
        }
        Insert: {
          covers?: number
          created_at?: string | null
          created_by?: string | null
          daily_found_id?: string | null
          deleted?: boolean | null
          description?: string | null
          discount_amount?: number
          discount_reason?: string | null
          establishment_id: string
          id?: string
          kds_status?: string
          opened?: boolean | null
          organization_id?: string | null
          server_id: string
          tables_id?: string | null
          updated_at?: string | null
        }
        Update: {
          covers?: number
          created_at?: string | null
          created_by?: string | null
          daily_found_id?: string | null
          deleted?: boolean | null
          description?: string | null
          discount_amount?: number
          discount_reason?: string | null
          establishment_id?: string
          id?: string
          kds_status?: string
          opened?: boolean | null
          organization_id?: string | null
          server_id?: string
          tables_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_daily_found_id_fkey"
            columns: ["daily_found_id"]
            isOneToOne: false
            referencedRelation: "daily_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tables_id_fkey"
            columns: ["tables_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          created_at: string
          deleted: boolean
          enabled: boolean
          enabled_at: string | null
          id: string
          max_concurrent_devices: number | null
          max_establishments: number | null
          module: string
          organization_id: string
          seats: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          enabled?: boolean
          enabled_at?: string | null
          id?: string
          max_concurrent_devices?: number | null
          max_establishments?: number | null
          module: string
          organization_id: string
          seats?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          enabled?: boolean
          enabled_at?: string | null
          id?: string
          max_concurrent_devices?: number | null
          max_establishments?: number | null
          module?: string
          organization_id?: string
          seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          description: string | null
          gocardless_customer_id: string | null
          gocardless_mandate_id: string | null
          id: string
          logo_url: string | null
          name: string
          pennylane_id: string | null
          settings: Json | null
          slug: string
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          gocardless_customer_id?: string | null
          gocardless_mandate_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          pennylane_id?: string | null
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          gocardless_customer_id?: string | null
          gocardless_mandate_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pennylane_id?: string | null
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          is_active: boolean | null
          organization_id: string
          payment_method_name: string
          payment_method_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          payment_method_name: string
          payment_method_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          payment_method_name?: string
          payment_method_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          bdaddress: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          devicename: string | null
          devicetype: string | null
          establishment_id: string | null
          id: string
          ipaddress: string | null
          location: string | null
          macaddress: string | null
          name: string | null
          organization_id: string | null
          target: string | null
          updated_at: string | null
        }
        Insert: {
          bdaddress?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          devicename?: string | null
          devicetype?: string | null
          establishment_id?: string | null
          id?: string
          ipaddress?: string | null
          location?: string | null
          macaddress?: string | null
          name?: string | null
          organization_id?: string | null
          target?: string | null
          updated_at?: string | null
        }
        Update: {
          bdaddress?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          devicename?: string | null
          devicetype?: string | null
          establishment_id?: string | null
          id?: string
          ipaddress?: string | null
          location?: string | null
          macaddress?: string | null
          name?: string | null
          organization_id?: string | null
          target?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compositions: {
        Row: {
          affects_stock: boolean
          auto_open_modal: boolean | null
          component_product_id: string
          composition_kind: string
          conversion_factor: number | null
          created_at: string | null
          default_quantity: number | null
          deleted: boolean | null
          display_order: number | null
          establishment_id: string
          id: string
          is_required: boolean | null
          main_product_id: string
          max_quantity: number | null
          organization_id: string
          price_multiplier: number | null
          quantity_unit: string | null
          show_in_customization: boolean
          unit_supplement_price: number | null
          updated_at: string | null
        }
        Insert: {
          affects_stock?: boolean
          auto_open_modal?: boolean | null
          component_product_id: string
          composition_kind?: string
          conversion_factor?: number | null
          created_at?: string | null
          default_quantity?: number | null
          deleted?: boolean | null
          display_order?: number | null
          establishment_id: string
          id?: string
          is_required?: boolean | null
          main_product_id: string
          max_quantity?: number | null
          organization_id: string
          price_multiplier?: number | null
          quantity_unit?: string | null
          show_in_customization?: boolean
          unit_supplement_price?: number | null
          updated_at?: string | null
        }
        Update: {
          affects_stock?: boolean
          auto_open_modal?: boolean | null
          component_product_id?: string
          composition_kind?: string
          conversion_factor?: number | null
          created_at?: string | null
          default_quantity?: number | null
          deleted?: boolean | null
          display_order?: number | null
          establishment_id?: string
          id?: string
          is_required?: boolean | null
          main_product_id?: string
          max_quantity?: number | null
          organization_id?: string
          price_multiplier?: number | null
          quantity_unit?: string | null
          show_in_customization?: boolean
          unit_supplement_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_compositions_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_compositions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_compositions_main_product_id_fkey"
            columns: ["main_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_compositions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_group_products: {
        Row: {
          created_at: string
          deleted: boolean
          display_order: number
          id: string
          option_group_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          display_order?: number
          id?: string
          option_group_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          display_order?: number
          id?: string
          option_group_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_group_products_group_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_group_products_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_group_values: {
        Row: {
          created_at: string
          deleted: boolean
          display_order: number
          id: string
          is_default: boolean
          is_visible: boolean
          max_quantity: number | null
          min_quantity: number | null
          option_group_id: string
          option_name: string
          option_price: number
          option_value: string
          tva_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          display_order?: number
          id?: string
          is_default?: boolean
          is_visible?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          option_group_id: string
          option_name: string
          option_price?: number
          option_value: string
          tva_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          display_order?: number
          id?: string
          is_default?: boolean
          is_visible?: boolean
          max_quantity?: number | null
          min_quantity?: number | null
          option_group_id?: string
          option_name?: string
          option_price?: number
          option_value?: string
          tva_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_group_values_group_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          allow_quantity: boolean
          auto_open_modal: boolean
          created_at: string
          deleted: boolean
          display_order: number
          establishment_id: string
          id: string
          is_required: boolean
          max_selections: number | null
          name: string
          organization_id: string
          selection_type: string
          updated_at: string
        }
        Insert: {
          allow_quantity?: boolean
          auto_open_modal?: boolean
          created_at?: string
          deleted?: boolean
          display_order?: number
          establishment_id: string
          id?: string
          is_required?: boolean
          max_selections?: number | null
          name: string
          organization_id: string
          selection_type?: string
          updated_at?: string
        }
        Update: {
          allow_quantity?: boolean
          auto_open_modal?: boolean
          created_at?: string
          deleted?: boolean
          display_order?: number
          establishment_id?: string
          id?: string
          is_required?: boolean
          max_selections?: number | null
          name?: string
          organization_id?: string
          selection_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_establishment_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_organization_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchase_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          establishment_id: string | null
          id: string
          notes: string | null
          order_unit: string | null
          organization_id: string
          product_id: string
          product_supplier_id: string | null
          source_doc_import_id: string | null
          supplier_id: string | null
          supplier_ref: string | null
          unit_cost: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          establishment_id?: string | null
          id?: string
          notes?: string | null
          order_unit?: string | null
          organization_id: string
          product_id: string
          product_supplier_id?: string | null
          source_doc_import_id?: string | null
          supplier_id?: string | null
          supplier_ref?: string | null
          unit_cost: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          establishment_id?: string | null
          id?: string
          notes?: string | null
          order_unit?: string | null
          organization_id?: string
          product_id?: string
          product_supplier_id?: string | null
          source_doc_import_id?: string | null
          supplier_id?: string | null
          supplier_ref?: string | null
          unit_cost?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchase_price_history_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_price_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_price_history_product_supplier_id_fkey"
            columns: ["product_supplier_id"]
            isOneToOne: false
            referencedRelation: "product_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_price_history_source_doc_import_id_fkey"
            columns: ["source_doc_import_id"]
            isOneToOne: false
            referencedRelation: "doc_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stocks: {
        Row: {
          created_at: string | null
          created_by: string | null
          critical_stock_threshold: number | null
          current_stock: number
          deleted: boolean | null
          establishment_id: string
          id: string
          inventory_tracked: boolean
          last_updated_by: string | null
          low_stock_threshold: number | null
          max_stock: number | null
          min_stock: number
          organization_id: string
          product_composition_id: string
          reserved_stock: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          critical_stock_threshold?: number | null
          current_stock?: number
          deleted?: boolean | null
          establishment_id: string
          id?: string
          inventory_tracked?: boolean
          last_updated_by?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number
          organization_id: string
          product_composition_id: string
          reserved_stock?: number
          unit?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          critical_stock_threshold?: number | null
          current_stock?: number
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          inventory_tracked?: boolean
          last_updated_by?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number
          organization_id?: string
          product_composition_id?: string
          reserved_stock?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stocks_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_product_composition_id_fkey"
            columns: ["product_composition_id"]
            isOneToOne: false
            referencedRelation: "product_compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted: boolean
          id: string
          is_preferred: boolean
          lead_time_days: number | null
          notes: string | null
          order_quantity: number | null
          order_unit: string | null
          organization_id: string
          product_id: string
          supplier_id: string
          supplier_product_name: string | null
          supplier_product_ref: string | null
          unit_price: number | null
          units_per_package: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          notes?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          organization_id: string
          product_id: string
          supplier_id: string
          supplier_product_name?: string | null
          supplier_product_ref?: string | null
          unit_price?: number | null
          units_per_package?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          notes?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          organization_id?: string
          product_id?: string
          supplier_id?: string
          supplier_product_name?: string | null
          supplier_product_ref?: string | null
          unit_price?: number | null
          units_per_package?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: Json
          category_id: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          display_order: number | null
          food_cost_target: number | null
          id: string
          is_available: boolean | null
          labels: Json
          name: string
          organization_id: string | null
          portion_unit: string | null
          portion_weight: number | null
          printer_id: string | null
          product_type: Json
          sku: string | null
          stock_mode: string
          updated_at: string | null
          vat_rate_id: string | null
        }
        Insert: {
          allergens?: Json
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          food_cost_target?: number | null
          id?: string
          is_available?: boolean | null
          labels?: Json
          name: string
          organization_id?: string | null
          portion_unit?: string | null
          portion_weight?: number | null
          printer_id?: string | null
          product_type?: Json
          sku?: string | null
          stock_mode?: string
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Update: {
          allergens?: Json
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          food_cost_target?: number | null
          id?: string
          is_available?: boolean | null
          labels?: Json
          name?: string
          organization_id?: string | null
          portion_unit?: string | null
          portion_weight?: number | null
          printer_id?: string | null
          product_type?: Json
          sku?: string | null
          stock_mode?: string
          updated_at?: string | null
          vat_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vat_rate_id_fkey"
            columns: ["vat_rate_id"]
            isOneToOne: false
            referencedRelation: "vat_rate"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          deleted: boolean | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          deleted?: boolean | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          deleted?: boolean | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_menu_items: {
        Row: {
          created_at: string | null
          deleted: boolean
          display_order: number
          id: string
          is_visible: boolean
          menus_product_id: string
          note: string | null
          organization_id: string
          section_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          display_order?: number
          id?: string
          is_visible?: boolean
          menus_product_id: string
          note?: string | null
          organization_id: string
          section_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          display_order?: number
          id?: string
          is_visible?: boolean
          menus_product_id?: string
          note?: string | null
          organization_id?: string
          section_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_menu_items_menus_product_id_fkey"
            columns: ["menus_product_id"]
            isOneToOne: false
            referencedRelation: "menus_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_menu_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "public_menu_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      public_menu_sections: {
        Row: {
          created_at: string | null
          deleted: boolean
          description: string | null
          display_order: number
          establishment_id: string
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          display_order?: number
          establishment_id: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          display_order?: number
          establishment_id?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_menu_sections_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_menu_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          background_color: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string | null
          id: string
          movement_type: string
          notes: string | null
          organization_id: string
          product_id: string
          product_stock_id: string
          product_supplier_id: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reference_id: string | null
          reference_type: string | null
          unit: string | null
          unit_cost: number | null
          work_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          organization_id: string
          product_id: string
          product_stock_id: string
          product_supplier_id?: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reference_id?: string | null
          reference_type?: string | null
          unit?: string | null
          unit_cost?: number | null
          work_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          product_stock_id?: string
          product_supplier_id?: string | null
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reference_id?: string | null
          reference_type?: string | null
          unit?: string | null
          unit_cost?: number | null
          work_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_stock_id_fkey"
            columns: ["product_stock_id"]
            isOneToOne: false
            referencedRelation: "product_stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_supplier_id_fkey"
            columns: ["product_supplier_id"]
            isOneToOne: false
            referencedRelation: "product_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          deleted: boolean
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          siret: string | null
          tva_intracommunautaire: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          siret?: string | null
          tva_intracommunautaire?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          siret?: string | null
          tva_intracommunautaire?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          role: string | null
          ticket_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          role?: string | null
          ticket_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          role?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_handled: boolean | null
          assigned_to: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          establishment_id: string | null
          id: string
          organization_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          ai_handled?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          establishment_id?: string | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          ai_handled?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          establishment_id?: string | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          height: number
          id: string
          is_primary: boolean | null
          name: string
          organization_id: string | null
          room_id: string | null
          rotation: number
          seats: number | null
          shape: string
          tables_connections_id: string | null
          updated_at: string | null
          width: number
          x: number
          y: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          height?: number
          id?: string
          is_primary?: boolean | null
          name: string
          organization_id?: string | null
          room_id?: string | null
          rotation?: number
          seats?: number | null
          shape?: string
          tables_connections_id?: string | null
          updated_at?: string | null
          width?: number
          x?: number
          y?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          height?: number
          id?: string
          is_primary?: boolean | null
          name?: string
          organization_id?: string | null
          room_id?: string | null
          rotation?: number
          seats?: number | null
          shape?: string
          tables_connections_id?: string | null
          updated_at?: string | null
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_tables_connections_id_fkey"
            columns: ["tables_connections_id"]
            isOneToOne: false
            referencedRelation: "tables_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      tables_connections: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          id: string
          name: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users_organizations: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          establishment_id: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          organization_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          establishment_id?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organizations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_rate: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          establishment_id: string
          id: string
          name: string | null
          organization_id: string | null
          updated_at: string | null
          value: number | null
          vat_assoc_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id: string
          id?: string
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          value?: number | null
          vat_assoc_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          value?: number | null
          vat_assoc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_rate_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_rate_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          created_at: string | null
          created_by: string
          ended_at: string | null
          establishment_id: string | null
          id: string
          organization_id: string
          session_name: string
          session_type: string
          started_at: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          ended_at?: string | null
          establishment_id?: string | null
          id?: string
          organization_id: string
          session_name: string
          session_type: string
          started_at?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          ended_at?: string | null
          establishment_id?: string | null
          id?: string
          organization_id?: string
          session_name?: string
          session_type?: string
          started_at?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_can_access_establishment: {
        Args: { p_est_id: string; p_org_id: string }
        Returns: boolean
      }
      cleanup_expired_device_sessions: { Args: never; Returns: undefined }
      cleanup_old_cache: { Args: never; Returns: number }
      cleanup_old_email_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_orphaned_gallery_images: { Args: never; Returns: number }
      create_default_payment_methods_for_establishment: {
        Args: { p_establishment_id: string; p_organization_id: string }
        Returns: undefined
      }
      ensure_self_product_composition: {
        Args: {
          p_establishment_id: string
          p_organization_id: string
          p_product_id: string
        }
        Returns: string
      }
      generate_15min_slots: {
        Args: { p_date: string; p_establishment_id: string }
        Returns: {
          available_capacity: number
          is_available: boolean
          max_capacity: number
          service_name: string
          slot_time: string
        }[]
      }
      generate_slots_for_date: {
        Args: { p_date: string; p_establishment_id: string }
        Returns: undefined
      }
      get_active_exceptions_for_date: {
        Args: { p_date: string; p_establishment_id: string }
        Returns: {
          booking_slot_id: string
          closed_slots: number[]
          description: string
          exception_type: string
          id: string
          reason: string
        }[]
      }
      get_active_menus_by_time: {
        Args: {
          p_current_time?: string
          p_establishment_id?: string
          p_organization_id: string
        }
        Returns: {
          display_order: number
          end_time: string
          image_url: string
          is_public: boolean
          menu_description: string
          menu_id: string
          menu_name: string
          menu_type: string
          start_time: string
        }[]
      }
      get_available_slots_simple: {
        Args: { p_date: string; p_establishment_id: string }
        Returns: {
          date: string
          end_time: string
          establishment_id: string
          is_available: boolean
          slot_id: string
          start_time: string
        }[]
      }
      get_establishment_gallery_section_images: {
        Args: { p_establishment_id: string; p_section: string }
        Returns: {
          alt_text: string
          created_at: string
          dimensions: Json
          display_order: number
          establishment_id: string
          file_size: number
          id: string
          image_description: string
          image_id: string
          image_name: string
          image_url: string
          mime_type: string
          organization_id: string
          section: string
          updated_at: string
        }[]
      }
      get_gallery_image_url: {
        Args: {
          p_establishment_id: string
          p_image_name: string
          p_organization_id: string
        }
        Returns: string
      }
      get_next_nf525_piece_number: {
        Args: {
          p_device_id: string
          p_establishment_id: string
          p_organization_id?: string
          p_piece_type: string
        }
        Returns: number
      }
      increment_doc_usage: {
        Args: { p_limit?: number; p_month: string; p_organization_id: string }
        Returns: boolean
      }
      is_slot_closed_by_exception: {
        Args: {
          p_booking_slot_id?: string
          p_date: string
          p_establishment_id: string
          p_slot_number: number
        }
        Returns: boolean
      }
      match_knowledge_base: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      reserve_nf525_piece_number_range: {
        Args: {
          p_count?: number
          p_device_id: string
          p_establishment_id: string
          p_organization_id?: string
          p_piece_type: string
        }
        Returns: {
          range_end: number
          range_start: number
        }[]
      }
      reserve_stock: {
        Args: {
          p_organization_id: string
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
        }
        Returns: boolean
      }
      unreserve_stock: {
        Args: {
          p_organization_id: string
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
        }
        Returns: boolean
      }
    }
    Enums: {
      TodosWithChildren: "todos" | "todos1"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      TodosWithChildren: ["todos", "todos1"],
    },
  },
} as const
