export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          page_url: string | null
          status: string
          store_id: string | null
          store_name: string | null
          title: string
          type: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          page_url?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          title: string
          type: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          page_url?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_feedback_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_primary: boolean
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          id: string
          performed_by: string
          reason: string
          store_id: string
          type: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string
          id?: string
          performed_by: string
          reason: string
          store_id: string
          type: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          id?: string
          performed_by?: string
          reason?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id", "store_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "cash_movements_performed_by_fkey"
            columns: ["performed_by", "store_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "cash_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          store_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
          store_id: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_opened_by_fkey"
            columns: ["opened_by", "store_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      module_activation_audit: {
        Row: {
          activation_id: string
          actor_id: string | null
          branch_id: string | null
          changed_at: string
          id: number
          module_id: string
          new_enabled: boolean | null
          old_enabled: boolean | null
          operation: string
          store_id: string
        }
        Insert: {
          activation_id: string
          actor_id?: string | null
          branch_id?: string | null
          changed_at?: string
          id?: never
          module_id: string
          new_enabled?: boolean | null
          old_enabled?: boolean | null
          operation: string
          store_id: string
        }
        Update: {
          activation_id?: string
          actor_id?: string | null
          branch_id?: string | null
          changed_at?: string
          id?: never
          module_id?: string
          new_enabled?: boolean | null
          old_enabled?: boolean | null
          operation?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_activation_audit_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      module_activations: {
        Row: {
          branch_id: string | null
          enabled: boolean
          id: string
          module_id: string
          store_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          enabled: boolean
          id?: string
          module_id: string
          store_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          enabled?: boolean
          id?: string
          module_id?: string
          store_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_activations_branch_id_store_id_fkey"
            columns: ["branch_id", "store_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "module_activations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_activations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      module_catalog: {
        Row: {
          id: string
          implementation_status: string
          required_feature: string | null
          scope: string
        }
        Insert: {
          id: string
          implementation_status: string
          required_feature?: string | null
          scope: string
        }
        Update: {
          id?: string
          implementation_status?: string
          required_feature?: string | null
          scope?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          annual_price: number
          code: string
          created_at: string
          features: Json
          id: string
          monthly_price: number
          name: string
          semiannual_price: number
        }
        Insert: {
          annual_price: number
          code: string
          created_at?: string
          features?: Json
          id?: string
          monthly_price: number
          name: string
          semiannual_price: number
        }
        Update: {
          annual_price?: number
          code?: string
          created_at?: string
          features?: Json
          id?: string
          monthly_price?: number
          name?: string
          semiannual_price?: number
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          barcode: string | null
          batch_number: string | null
          cost_price: number
          created_at: string
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          product_id: string
          sale_price: number
          sku: string | null
          stock_quantity: number
          store_id: string
          supplier_id: string | null
          track_batch: boolean
          unit: string
        }
        Insert: {
          barcode?: string | null
          batch_number?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          product_id: string
          sale_price?: number
          sku?: string | null
          stock_quantity?: number
          store_id: string
          supplier_id?: string | null
          track_batch?: boolean
          unit?: string
        }
        Update: {
          barcode?: string | null
          batch_number?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          product_id?: string
          sale_price?: number
          sku?: string | null
          stock_quantity?: number
          store_id?: string
          supplier_id?: string | null
          track_batch?: boolean
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_supplier_id_fkey"
            columns: ["supplier_id", "store_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          store_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          store_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id", "store_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          cost_price: number
          id: string
          purchase_order_id: string
          quantity: number
          subtotal: number
          variant_id: string
        }
        Insert: {
          cost_price: number
          id?: string
          purchase_order_id: string
          quantity: number
          subtotal: number
          variant_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          purchase_order_id?: string
          quantity?: number
          subtotal?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_number: string
          ordered_at: string | null
          received_at: string | null
          status: string
          store_id: string
          supplier_id: string
          total_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          store_id: string
          supplier_id: string
          total_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          store_id?: string
          supplier_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by", "store_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id", "store_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number
          discount: number
          id: string
          product_variant_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          cost_price?: number
          discount?: number
          id?: string
          product_variant_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          cost_price?: number
          discount?: number
          id?: string
          product_variant_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          sale_id: string
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          sale_id: string
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          sale_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id", "store_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "sale_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_register_id: string
          created_at: string
          customer_email: string | null
          customer_id: string | null
          discount: number
          id: string
          idempotency_key: string | null
          payment_method: string
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          sold_by: string
          status: string
          store_id: string
          subtotal: number
          total: number
        }
        Insert: {
          cash_register_id: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          idempotency_key?: string | null
          payment_method: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          sold_by: string
          status?: string
          store_id: string
          subtotal?: number
          total?: number
        }
        Update: {
          cash_register_id?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          idempotency_key?: string | null
          payment_method?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          sold_by?: string
          status?: string
          store_id?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id", "store_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id", "store_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id", "store_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "sales_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sold_by_fkey"
            columns: ["sold_by", "store_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          new_stock: number
          performed_by: string | null
          previous_stock: number
          quantity_change: number
          reason: string | null
          store_id: string
          type: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_stock: number
          performed_by?: string | null
          previous_stock: number
          quantity_change: number
          reason?: string | null
          store_id: string
          type: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          quantity_change?: number
          reason?: string | null
          store_id?: string
          type?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by", "store_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id", "store_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          allow_negative_stock: boolean
          auto_print_ticket: boolean
          barcode_label_show_price: boolean
          barcode_label_show_store_name: boolean
          barcode_label_size: string
          blind_physical_count: boolean
          city: string | null
          commercial_name: string | null
          country: string | null
          created_at: string
          currency_code: string
          currency_symbol: string
          decimal_places: number
          default_low_stock_threshold: number
          default_opening_cash: number
          default_product_unit: string
          email: string | null
          expiry_alert_days: number
          id: string
          internal_barcode_prefix: string
          legal_name: string | null
          logo_url: string | null
          max_cash_register_hours: number
          phone: string | null
          print_cashier_name: boolean
          print_logo_on_ticket: boolean
          purchase_order_prefix: string
          require_customer_for_sale: boolean
          show_tax_details: boolean
          store_id: string
          target_profit_margin: number | null
          tax_id: string | null
          ticket_footer: string | null
          ticket_header: string | null
          ticket_legal_disclaimer: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_negative_stock?: boolean
          auto_print_ticket?: boolean
          barcode_label_show_price?: boolean
          barcode_label_show_store_name?: boolean
          barcode_label_size?: string
          blind_physical_count?: boolean
          city?: string | null
          commercial_name?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          decimal_places?: number
          default_low_stock_threshold?: number
          default_opening_cash?: number
          default_product_unit?: string
          email?: string | null
          expiry_alert_days?: number
          id?: string
          internal_barcode_prefix?: string
          legal_name?: string | null
          logo_url?: string | null
          max_cash_register_hours?: number
          phone?: string | null
          print_cashier_name?: boolean
          print_logo_on_ticket?: boolean
          purchase_order_prefix?: string
          require_customer_for_sale?: boolean
          show_tax_details?: boolean
          store_id: string
          target_profit_margin?: number | null
          tax_id?: string | null
          ticket_footer?: string | null
          ticket_header?: string | null
          ticket_legal_disclaimer?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_negative_stock?: boolean
          auto_print_ticket?: boolean
          barcode_label_show_price?: boolean
          barcode_label_show_store_name?: boolean
          barcode_label_size?: string
          blind_physical_count?: boolean
          city?: string | null
          commercial_name?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          decimal_places?: number
          default_low_stock_threshold?: number
          default_opening_cash?: number
          default_product_unit?: string
          email?: string | null
          expiry_alert_days?: number
          id?: string
          internal_barcode_prefix?: string
          legal_name?: string | null
          logo_url?: string | null
          max_cash_register_hours?: number
          phone?: string | null
          print_cashier_name?: boolean
          print_logo_on_ticket?: boolean
          purchase_order_prefix?: string
          require_customer_for_sale?: boolean
          show_tax_details?: boolean
          store_id?: string
          target_profit_margin?: number | null
          tax_id?: string | null
          ticket_footer?: string | null
          ticket_header?: string | null
          ticket_legal_disclaimer?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          billing_cycle: string | null
          business_type: string
          created_at: string
          feature_overrides: Json
          grace_period_days: number
          id: string
          industry_sub_type: string
          name: string
          owner_id: string
          plan_id: string | null
          subscription_ends_at: string | null
          subscription_status: string
          trial_ends_at: string
        }
        Insert: {
          billing_cycle?: string | null
          business_type?: string
          created_at?: string
          feature_overrides?: Json
          grace_period_days?: number
          id?: string
          industry_sub_type?: string
          name: string
          owner_id: string
          plan_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string
          trial_ends_at?: string
        }
        Update: {
          billing_cycle?: string | null
          business_type?: string
          created_at?: string
          feature_overrides?: Json
          grace_period_days?: number
          id?: string
          industry_sub_type?: string
          name?: string
          owner_id?: string
          plan_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string
          trial_ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string
          period_end: string
          period_start: string
          recorded_by: string | null
          reference: string | null
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method: string
          period_end: string
          period_start: string
          recorded_by?: string | null
          reference?: string | null
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          period_end?: string
          period_start?: string
          recorded_by?: string | null
          reference?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          store_id: string
          tax_id: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          store_id: string
          tax_id?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          store_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: string
          store_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_metrics: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_purchase_at: string | null
          notes: string | null
          phone: string | null
          store_id: string | null
          total_purchases: number | null
          total_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_variant_stock: {
        Args: {
          p_new_stock: number
          p_reason?: string
          p_type: string
          p_variant_id: string
        }
        Returns: string
      }
      admin_force_close_cash_register: {
        Args: { p_register_id: string }
        Returns: undefined
      }
      admin_record_payment_and_renew: {
        Args: {
          p_amount: number
          p_manual_end_date?: string
          p_notes?: string
          p_payment_method: string
          p_reference?: string
          p_store_id: string
        }
        Returns: Json
      }
      check_duplicate_customer: {
        Args: {
          p_email?: string
          p_exclude_customer_id?: string
          p_phone?: string
          p_store_id: string
        }
        Returns: {
          email: string
          full_name: string
          id: string
          matched_by: string
          phone: string
        }[]
      }
      create_product_with_variant: {
        Args: { p_product: Json; p_variant: Json }
        Returns: Json
      }
      create_sale: {
        Args: {
          p_cash_register_id: string
          p_created_at?: string
          p_customer_email?: string
          p_customer_id?: string
          p_discount?: number
          p_idempotency_key?: string
          p_items: Json
          p_payment_method: string
          p_payments?: Json
        }
        Returns: string
      }
      get_admin_stores_overview: { Args: never; Returns: Json }
      get_open_register_notice: {
        Args: never
        Returns: { id: string; opened_by_name: string }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_store_id: { Args: never; Returns: string }
      get_store_analytics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      internal_admin_stores_overview: { Args: never; Returns: Json }
      internal_store_features: { Args: { p_store_id: string }; Returns: Json }
      is_store_admin_or_owner: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      receive_purchase_order: { Args: { p_order_id: string }; Returns: boolean }
      refund_sale: {
        Args: {
          p_disburse_cash_register_id?: string
          p_reason?: string
          p_sale_id: string
        }
        Returns: boolean
      }
      require_store_role: {
        Args: { p_feature?: string; p_roles: string[] }
        Returns: string
      }
      store_features: { Args: { p_store_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

