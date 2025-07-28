export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
          deleted: boolean | null
          display_order: number | null
          end_time: string
          establishment_id: string
          id: string
          is_active: boolean | null
          max_capacity: number | null
          organization_id: string | null
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
          deleted?: boolean | null
          display_order?: number | null
          end_time: string
          establishment_id: string
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          organization_id?: string | null
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
          deleted?: boolean | null
          display_order?: number | null
          end_time?: string
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          organization_id?: string | null
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
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          date: string
          deleted: boolean | null
          establishment_id: string
          id: string
          number_of_guests: number
          organization_id: string
          service_name: string
          special_requests: string | null
          status: string
          time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          date: string
          deleted?: boolean | null
          establishment_id: string
          id?: string
          number_of_guests: number
          organization_id: string
          service_name: string
          special_requests?: string | null
          status?: string
          time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_email?: string
          customer_first_name?: string
          customer_last_name?: string
          customer_phone?: string
          date?: string
          deleted?: boolean | null
          establishment_id?: string
          id?: string
          number_of_guests?: number
          organization_id?: string
          service_name?: string
          special_requests?: string | null
          status?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
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
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          id: string
          name: string
          organization_id: string | null
          parent_category_id: string | null
          updated_at: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name: string
          organization_id?: string | null
          parent_category_id?: string | null
          updated_at?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          name?: string
          organization_id?: string | null
          parent_category_id?: string | null
          updated_at?: string | null
          vat_rate?: number
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
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_grid_items: {
        Row: {
          background_color: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number
          grid_column: number
          grid_row: number
          icon_url: string | null
          id: string
          is_clickable: boolean
          is_visible: boolean
          organization_id: string
          parent_category_id: string | null
          product_id: string | null
          text_color: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          background_color?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          grid_column?: number
          grid_row?: number
          icon_url?: string | null
          id?: string
          is_clickable?: boolean
          is_visible?: boolean
          organization_id: string
          parent_category_id?: string | null
          product_id?: string | null
          text_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          background_color?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          grid_column?: number
          grid_row?: number
          icon_url?: string | null
          id?: string
          is_clickable?: boolean
          is_visible?: boolean
          organization_id?: string
          parent_category_id?: string | null
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
            foreignKeyName: "category_grid_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_grid_items_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          id: string
          opened: boolean | null
          opened_at_at: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          opened?: boolean | null
          opened_at_at?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          opened?: boolean | null
          opened_at_at?: string | null
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
      email_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_template: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          subject_template: string
          text_template: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_template: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          subject_template: string
          text_template: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          subject_template?: string
          text_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address: string | null
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
          organization_id: string
          phone: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
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
          organization_id: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
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
          organization_id?: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
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
          establishments_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_public: boolean | null
          name: string | null
          organization_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishments_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string | null
          organization_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          display_order?: number | null
          establishments_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string | null
          organization_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_establishments_id_fkey"
            columns: ["establishments_id"]
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
          created_by: string | null
          deleted: boolean | null
          id: string
          menus_id: string | null
          organization_id: string
          price: number | null
          products_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          menus_id?: string | null
          organization_id: string
          price?: number | null
          products_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          menus_id?: string | null
          organization_id?: string
          price?: number | null
          products_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
      orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_found_id: string | null
          deleted: boolean | null
          description: string | null
          id: string
          opened: boolean | null
          organization_id: string | null
          tables_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_found_id?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          opened?: boolean | null
          organization_id?: string | null
          tables_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_found_id?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          opened?: boolean | null
          organization_id?: string | null
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
            foreignKeyName: "orders_tables_id_fkey"
            columns: ["tables_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_payments: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          id: string
          name: string
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
          id?: string
          name: string
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
          id?: string
          name?: string
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
      orders_payments_rows: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          id: string
          orders_payments_id: string | null
          organization_id: string | null
          payment_type: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          orders_payments_id?: string | null
          organization_id?: string | null
          payment_type?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          id?: string
          orders_payments_id?: string | null
          organization_id?: string | null
          payment_type?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_payments_rows_orders_payments_id_fkey"
            columns: ["orders_payments_id"]
            isOneToOne: false
            referencedRelation: "orders_payments"
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
      orders_rows: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          id: string
          name: string
          orders_id: string | null
          organization_id: string | null
          price: number | null
          total: boolean | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          name: string
          orders_id?: string | null
          organization_id?: string | null
          price?: number | null
          total?: boolean | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          name?: string
          orders_id?: string | null
          organization_id?: string | null
          price?: number | null
          total?: boolean | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_rows_orders_id_fkey"
            columns: ["orders_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_rows_parts: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          id: string
          name: string
          orders_payments_id: string | null
          orders_rows_id: string | null
          organization_id: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          name: string
          orders_payments_id?: string | null
          orders_rows_id?: string | null
          organization_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          name?: string
          orders_payments_id?: string | null
          orders_rows_id?: string | null
          organization_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_rows_parts_orders_payments_fkey"
            columns: ["orders_payments_id"]
            isOneToOne: false
            referencedRelation: "orders_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rows_parts_orders_rows_id_fkey"
            columns: ["orders_rows_id"]
            isOneToOne: false
            referencedRelation: "orders_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rows_parts_organization_id_fkey"
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
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      printers: {
        Row: {
          bdaddress: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          devicename: string | null
          devicetype: string | null
          id: string
          ipaddress: string | null
          location: string | null
          macaddress: string | null
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
          id?: string
          ipaddress?: string | null
          location?: string | null
          macaddress?: string | null
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
          id?: string
          ipaddress?: string | null
          location?: string | null
          macaddress?: string | null
          organization_id?: string | null
          target?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          last_updated_by: string | null
          low_stock_threshold: number | null
          max_stock: number | null
          min_stock: number
          organization_id: string
          product_id: string
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
          last_updated_by?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number
          organization_id: string
          product_id: string
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
          last_updated_by?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number
          organization_id?: string
          product_id?: string
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
            foreignKeyName: "product_stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          organization_id: string | null
          price: number
          updated_at: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          organization_id?: string | null
          price: number
          updated_at?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted?: boolean | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          organization_id?: string | null
          price?: number
          updated_at?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      rooms: {
        Row: {
          background_color: string | null
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
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
          created_by: string
          id: string
          movement_type: string
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reference_id: string | null
          reference_type: string | null
          work_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          movement_type: string
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reference_id?: string | null
          reference_type?: string | null
          work_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reference_id?: string | null
          reference_type?: string | null
          work_session_id?: string | null
        }
        Relationships: [
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
        ]
      }
      tables: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          deleted: boolean | null
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
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted: boolean | null
          email: string | null
          establishment_id: string
          firstname: string
          id: string
          is_active: boolean | null
          lastname: string
          organization_id: string | null
          password: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          establishment_id: string
          firstname: string
          id?: string
          is_active?: boolean | null
          lastname: string
          organization_id?: string | null
          password: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted?: boolean | null
          email?: string | null
          establishment_id?: string
          firstname?: string
          id?: string
          is_active?: boolean | null
          lastname?: string
          organization_id?: string | null
          password?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
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
      users_organizations: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          id: string
          organization_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          organization_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          organization_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
          id?: string
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          value?: number | null
          vat_assoc_id?: string | null
        }
        Relationships: [
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
      add_stock_movement: {
        Args: {
          p_product_id: string
          p_organization_id: string
          p_movement_type: string
          p_quantity: number
          p_reference_type?: string
          p_reference_id?: string
          p_notes?: string
          p_work_session_id?: string
        }
        Returns: string
      }
      cleanup_old_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_email_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      generate_15min_slots: {
        Args: { p_establishment_id: string; p_date: string }
        Returns: {
          slot_time: string
          service_name: string
          is_available: boolean
          available_capacity: number
          max_capacity: number
        }[]
      }
      generate_slots_for_date: {
        Args: { p_establishment_id: string; p_date: string }
        Returns: undefined
      }
      get_active_exceptions_for_date: {
        Args: { p_establishment_id: string; p_date: string }
        Returns: {
          id: string
          exception_type: string
          booking_slot_id: string
          closed_slots: number[]
          reason: string
          description: string
        }[]
      }
      get_active_menus_by_time: {
        Args: {
          p_organization_id: string
          p_current_time?: string
          p_establishment_id?: string
        }
        Returns: {
          menu_id: string
          menu_name: string
          menu_description: string
          menu_type: string
          start_time: string
          end_time: string
          is_public: boolean
          display_order: number
          image_url: string
        }[]
      }
      get_available_slots_simple: {
        Args: { p_establishment_id: string; p_date: string }
        Returns: {
          slot_id: string
          start_time: string
          end_time: string
          is_available: boolean
          establishment_id: string
          date: string
        }[]
      }
      get_available_stock: {
        Args: { p_product_id: string; p_organization_id: string }
        Returns: number
      }
      get_current_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_menu_products: {
        Args: { p_menu_id: string }
        Returns: {
          product_id: string
          product_name: string
          product_description: string
          menu_price: number
          product_base_price: number
          vat_rate: number
          category_id: string
          category_name: string
        }[]
      }
      get_stock_alerts: {
        Args: { p_organization_id?: string }
        Returns: {
          product_id: string
          product_name: string
          current_stock: number
          min_stock: number
          unit: string
          alert_level: string
          alert_message: string
        }[]
      }
      get_user_organization: {
        Args: { user_uuid: string }
        Returns: string
      }
      hard_delete_record: {
        Args: { table_name: string; record_id: string }
        Returns: boolean
      }
      is_slot_closed_by_exception: {
        Args: {
          p_establishment_id: string
          p_date: string
          p_slot_number: number
          p_booking_slot_id?: string
        }
        Returns: boolean
      }
      reserve_stock: {
        Args: {
          p_product_id: string
          p_organization_id: string
          p_quantity: number
          p_reference_type: string
          p_reference_id: string
        }
        Returns: boolean
      }
      restore_deleted_record: {
        Args: { table_name: string; record_id: string }
        Returns: boolean
      }
      slot_to_time: {
        Args: { slot_number: number }
        Returns: string
      }
      soft_delete_custom_domain: {
        Args: { domain_id: string }
        Returns: boolean
      }
      soft_delete_establishment: {
        Args: { est_id: string }
        Returns: boolean
      }
      soft_delete_order: {
        Args: { order_id: string }
        Returns: boolean
      }
      soft_delete_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      soft_delete_product: {
        Args: { product_id: string }
        Returns: boolean
      }
      soft_delete_record: {
        Args: { table_name: string; record_id: string }
        Returns: boolean
      }
      soft_delete_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      test_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          current_user_role: string
          test_result: string
        }[]
      }
      time_range_to_slots: {
        Args: { start_time: string; end_time: string }
        Returns: number[]
      }
      time_to_slot: {
        Args: { time_value: string }
        Returns: number
      }
      unreserve_stock: {
        Args: {
          p_product_id: string
          p_organization_id: string
          p_quantity: number
          p_reference_type: string
          p_reference_id: string
        }
        Returns: boolean
      }
      validate_closed_slots: {
        Args: { slots: number[] }
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
