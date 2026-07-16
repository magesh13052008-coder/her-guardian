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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          relation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          relation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          relation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journeys: {
        Row: {
          created_at: string
          dest_lat: number
          dest_lng: number
          dest_name: string
          deviation_alerted: boolean
          ended_at: string | null
          expected_arrival: string
          id: string
          late_alerted: boolean
          start_lat: number | null
          start_lng: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dest_lat: number
          dest_lng: number
          dest_name: string
          deviation_alerted?: boolean
          ended_at?: string | null
          expected_arrival: string
          id?: string
          late_alerted?: boolean
          start_lat?: number | null
          start_lng?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dest_lat?: number
          dest_lng?: number
          dest_name?: string
          deviation_alerted?: boolean
          ended_at?: string | null
          expected_arrival?: string
          id?: string
          late_alerted?: boolean
          start_lat?: number | null
          start_lng?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      live_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      location_trail: {
        Row: {
          accuracy: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          arrival_enabled: boolean
          checkin_enabled: boolean
          journey_enabled: boolean
          quiet_end: number | null
          quiet_start: number | null
          threat_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_enabled?: boolean
          checkin_enabled?: boolean
          journey_enabled?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          threat_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_enabled?: boolean
          checkin_enabled?: boolean
          journey_enabled?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          threat_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          delivered: boolean
          id: string
          location_url: string | null
          priority: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          delivered?: boolean
          id?: string
          location_url?: string | null
          priority?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          delivered?: boolean
          id?: string
          location_url?: string | null
          priority?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          id?: string
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          plan_id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      safe_zones: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          radius_m: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          radius_m?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius_m?: number
          user_id?: string
        }
        Relationships: []
      }
      safeword_settings: {
        Row: {
          created_at: string
          enabled: boolean
          last_triggered: string | null
          trigger_count: number
          updated_at: string
          user_id: string
          word_encoded: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          last_triggered?: string | null
          trigger_count?: number
          updated_at?: string
          user_id: string
          word_encoded?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          last_triggered?: string | null
          trigger_count?: number
          updated_at?: string
          user_id?: string
          word_encoded?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          detail: string | null
          detected_at: string
          id: string
          kind: string
          resolved: boolean
          resolved_at: string | null
          table_name: string
        }
        Insert: {
          detail?: string | null
          detected_at?: string
          id?: string
          kind: string
          resolved?: boolean
          resolved_at?: string | null
          table_name: string
        }
        Update: {
          detail?: string | null
          detected_at?: string
          id?: string
          kind?: string
          resolved?: boolean
          resolved_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      security_baseline: {
        Row: {
          created_at: string
          expected_policy_count: number
          rls_enabled: boolean
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_policy_count: number
          rls_enabled: boolean
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_policy_count?: number
          rls_enabled?: boolean
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          accuracy: number | null
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          status: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          interval: string
          name: string
          price_inr: number
          tier: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id: string
          interval?: string
          name: string
          price_inr: number
          tier: number
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          interval?: string
          name?: string
          price_inr?: number
          tier?: number
        }
        Relationships: []
      }
      threat_logs: {
        Row: {
          action_taken: string | null
          created_at: string
          detail: string | null
          id: string
          latitude: number | null
          longitude: number | null
          risk_level: string
          threat_type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          risk_level: string
          threat_type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          risk_level?: string
          threat_type?: string
          user_id?: string
        }
        Relationships: []
      }
      trigger_logs: {
        Row: {
          contacts_notified: number
          created_at: string
          id: string
          is_test: boolean
          latitude: number | null
          longitude: number | null
          source: string
          user_id: string
        }
        Insert: {
          contacts_notified?: number
          created_at?: string
          id?: string
          is_test?: boolean
          latitude?: number | null
          longitude?: number | null
          source: string
          user_id: string
        }
        Update: {
          contacts_notified?: number
          created_at?: string
          id?: string
          is_test?: boolean
          latitude?: number | null
          longitude?: number | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_security_baseline: { Args: never; Returns: number }
      get_active_plan_tier: { Args: { _user_id: string }; Returns: number }
      get_shared_location: {
        Args: { _token: string }
        Returns: {
          accuracy: number
          display_name: string
          expires_at: string
          latitude: number
          longitude: number
          speed: number
          updated_at: string
        }[]
      }
      get_shared_trail: {
        Args: { _token: string }
        Returns: {
          latitude: number
          longitude: number
          recorded_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
