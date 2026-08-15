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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          bid_amount: number | null
          body: string
          created_at: string
          hidden: boolean
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          bid_amount?: number | null
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          bid_amount?: number | null
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          job_id: string | null
          kind: string
          worker_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          worker_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_profiles: {
        Row: {
          badge_kind: string
          badge_status: string
          created_at: string
          hq_address: string | null
          id: string
          legal_doc_url: string | null
          legal_name: string
          logo_url: string | null
          mission: string | null
          owner_id: string
          pic_contact: string | null
          pic_name: string | null
          total_budget: number
          total_projects: number
          website: string | null
          workers_absorbed: number
        }
        Insert: {
          badge_kind?: string
          badge_status?: string
          created_at?: string
          hq_address?: string | null
          id?: string
          legal_doc_url?: string | null
          legal_name: string
          logo_url?: string | null
          mission?: string | null
          owner_id: string
          pic_contact?: string | null
          pic_name?: string | null
          total_budget?: number
          total_projects?: number
          website?: string | null
          workers_absorbed?: number
        }
        Update: {
          badge_kind?: string
          badge_status?: string
          created_at?: string
          hq_address?: string | null
          id?: string
          legal_doc_url?: string | null
          legal_name?: string
          logo_url?: string | null
          mission?: string | null
          owner_id?: string
          pic_contact?: string | null
          pic_name?: string | null
          total_budget?: number
          total_projects?: number
          website?: string | null
          workers_absorbed?: number
        }
        Relationships: []
      }
      job_private_details: {
        Row: {
          contact_phone: string | null
          exact_address: string | null
          job_id: string
        }
        Insert: {
          contact_phone?: string | null
          exact_address?: string | null
          job_id: string
        }
        Update: {
          contact_phone?: string | null
          exact_address?: string | null
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_private_details_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          after_photo: string | null
          area_label: string | null
          before_photo: string | null
          client_id: string
          created_at: string
          description: string
          expires_at: string | null
          headcount: number
          id: string
          institution_kind: string | null
          is_institutional: boolean
          lat: number | null
          lng: number | null
          location_mode: Database["public"]["Enums"]["location_mode"]
          locked_worker_id: string | null
          payment_amount: number
          payment_type: Database["public"]["Enums"]["payment_type"]
          photos: string[]
          requirements: string | null
          skill_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          timing_mode: Database["public"]["Enums"]["timing_mode"]
          title: string
        }
        Insert: {
          after_photo?: string | null
          area_label?: string | null
          before_photo?: string | null
          client_id: string
          created_at?: string
          description: string
          expires_at?: string | null
          headcount?: number
          id?: string
          institution_kind?: string | null
          is_institutional?: boolean
          lat?: number | null
          lng?: number | null
          location_mode?: Database["public"]["Enums"]["location_mode"]
          locked_worker_id?: string | null
          payment_amount?: number
          payment_type?: Database["public"]["Enums"]["payment_type"]
          photos?: string[]
          requirements?: string | null
          skill_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          timing_mode?: Database["public"]["Enums"]["timing_mode"]
          title: string
        }
        Update: {
          after_photo?: string | null
          area_label?: string | null
          before_photo?: string | null
          client_id?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          headcount?: number
          id?: string
          institution_kind?: string | null
          is_institutional?: boolean
          lat?: number | null
          lng?: number | null
          location_mode?: Database["public"]["Enums"]["location_mode"]
          locked_worker_id?: string | null
          payment_amount?: number
          payment_type?: Database["public"]["Enums"]["payment_type"]
          photos?: string[]
          requirements?: string | null
          skill_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          timing_mode?: Database["public"]["Enums"]["timing_mode"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          issuer: string | null
          kind: string
          media_url: string | null
          title: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issuer?: string | null
          kind?: string
          media_url?: string | null
          title: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issuer?: string | null
          kind?: string
          media_url?: string | null
          title?: string
          worker_id?: string
        }
        Relationships: []
      }
      profile_contacts: {
        Row: {
          exact_address: string | null
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          exact_address?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          exact_address?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          domisili: string | null
          full_name: string
          headline: string | null
          id: string
          jobs_completed: number
          kind: Database["public"]["Enums"]["user_kind"]
          ktp_verified: boolean
          lat: number | null
          lng: number | null
          rating: number
          whatsapp_verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domisili?: string | null
          full_name?: string
          headline?: string | null
          id: string
          jobs_completed?: number
          kind?: Database["public"]["Enums"]["user_kind"]
          ktp_verified?: boolean
          lat?: number | null
          lng?: number | null
          rating?: number
          whatsapp_verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domisili?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          jobs_completed?: number
          kind?: Database["public"]["Enums"]["user_kind"]
          ktp_verified?: boolean
          lat?: number | null
          lng?: number | null
          rating?: number
          whatsapp_verified?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_preview: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_preview?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_preview?: string | null
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          flagged: boolean
          id: string
          job_id: string | null
          rating: number
          reviewer_id: string
          reviewer_name: string
          worker_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          job_id?: string | null
          rating: number
          reviewer_id: string
          reviewer_name: string
          worker_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          job_id?: string | null
          rating?: number
          reviewer_id?: string
          reviewer_name?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions_escrow: {
        Row: {
          amount: number
          client_id: string
          commission: number
          created_at: string
          dispute_reason: string | null
          id: string
          job_id: string
          status: Database["public"]["Enums"]["escrow_status"]
          worker_id: string
        }
        Insert: {
          amount: number
          client_id: string
          commission?: number
          created_at?: string
          dispute_reason?: string | null
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["escrow_status"]
          worker_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          commission?: number
          created_at?: string
          dispute_reason?: string | null
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["escrow_status"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_escrow_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_ref: string | null
          amount: number
          created_at: string
          id: string
          method: string
          status: string
          worker_id: string
        }
        Insert: {
          account_ref?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          status?: string
          worker_id: string
        }
        Update: {
          account_ref?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_skills: {
        Row: {
          skill_id: string
          worker_id: string
        }
        Insert: {
          skill_id: string
          worker_id: string
        }
        Update: {
          skill_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_platform_stats: {
        Args: never
        Returns: {
          commission: number
          completed_jobs: number
          gmv: number
          open_jobs: number
          total_jobs: number
          total_users: number
          total_workers: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin_super"
        | "admin_moderator"
        | "admin_finance"
        | "admin_affiliate"
      escrow_status: "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED"
      job_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "COMPLETED"
        | "CANCELLED"
        | "DISPUTED"
      location_mode: "onsite" | "remote"
      payment_type: "selesai_kerja" | "harian" | "borongan" | "mingguan"
      timing_mode: "urgent" | "scheduled" | "flexible"
      user_kind: "client_individual" | "client_enterprise" | "worker"
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
      app_role: [
        "admin_super",
        "admin_moderator",
        "admin_finance",
        "admin_affiliate",
      ],
      escrow_status: ["HELD", "RELEASED", "REFUNDED", "DISPUTED"],
      job_status: [
        "OPEN",
        "IN_PROGRESS",
        "SUBMITTED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ],
      location_mode: ["onsite", "remote"],
      payment_type: ["selesai_kerja", "harian", "borongan", "mingguan"],
      timing_mode: ["urgent", "scheduled", "flexible"],
      user_kind: ["client_individual", "client_enterprise", "worker"],
    },
  },
} as const
