// Hand-written to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript` once the project is linked, and keep this
// file in sync with the migrations until then.
//
// Every table needs `Relationships: []` and the schema needs `Views: {}` —
// omitting them doesn't error directly, it silently collapses postgrest-js's
// generic inference to `never` on unrelated queries against that schema.

export type PaymentStatus = "pending" | "confirmed" | "rejected";
export type OrderStatus = "unclaimed" | "claimed" | "purchased" | "delivered";

export interface Database {
  public: {
    Tables: {
      operators: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "operator";
          active: boolean;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: {
          name?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      couriers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          active: boolean;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: {
          name?: string;
          phone?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      cafeterias: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          photo_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          photo_url?: string | null;
          active?: boolean;
        };
        Update: Partial<{
          name: string;
          description: string | null;
          photo_url: string | null;
          active: boolean;
        }>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          cafeteria_id: string;
          name: string;
          price_per_spoon: number;
          photo_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          cafeteria_id: string;
          name: string;
          price_per_spoon: number;
          photo_url?: string | null;
          active?: boolean;
        };
        Update: Partial<{
          name: string;
          price_per_spoon: number;
          photo_url: string | null;
          active: boolean;
        }>;
        Relationships: [];
      };
      delivery_destinations: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      delivery_fees: {
        Row: {
          id: string;
          cafeteria_id: string;
          destination_id: string;
          fee: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          cafeteria_id: string;
          destination_id: string;
          fee: number;
        };
        Update: {
          fee: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_contact: string;
          cafeteria_id: string;
          destination_id: string;
          food_total: number;
          delivery_fee: number;
          grand_total: number;
          payment_proof_url: string | null;
          payment_status: PaymentStatus;
          status: OrderStatus;
          substitution_used: boolean;
          substitution_note: string | null;
          courier_id: string | null;
          created_at: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          purchased_at: string | null;
          delivered_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      order_lines: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          spoon_count: number;
          line_total: number;
          is_backup: boolean;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          courier_id: string;
          claimed_at: string;
          funded_at: string | null;
          funded_by: string | null;
          purchased_at: string | null;
          delivered_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          operator_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: {
        Args: {
          p_customer_contact: string;
          p_cafeteria_id: string;
          p_destination_id: string;
          p_primary_lines: { menu_item_id: string; spoon_count: number }[];
          p_backup_lines: { menu_item_id: string; spoon_count: number }[];
        };
        Returns: string;
      };
      attach_payment_proof: {
        Args: { p_order_id: string; p_proof_url: string };
        Returns: void;
      };
      get_order_status: {
        Args: { p_order_id: string; p_customer_contact: string };
        Returns: {
          status: OrderStatus;
          payment_status: PaymentStatus;
          substitution_used: boolean;
          grand_total: number;
          created_at: string;
        }[];
      };
      claim_order: {
        Args: { p_order_id: string };
        Returns: void;
      };
      mark_order_purchased: {
        Args: {
          p_order_id: string;
          p_substitution_used: boolean;
          p_substitution_note?: string | null;
        };
        Returns: void;
      };
      mark_order_delivered: {
        Args: { p_order_id: string };
        Returns: void;
      };
      confirm_payment: {
        Args: { p_order_id: string };
        Returns: void;
      };
      reject_payment: {
        Args: { p_order_id: string };
        Returns: void;
      };
      fund_courier: {
        Args: { p_order_id: string };
        Returns: void;
      };
    };
  };
}
