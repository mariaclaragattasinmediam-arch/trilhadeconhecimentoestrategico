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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      access_audit: {
        Row: {
          action: string
          actor_id: string | null
          course_id: string | null
          created_at: string
          detalhe: string
          group_id: string | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          course_id?: string | null
          created_at?: string
          detalhe?: string
          group_id?: string | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          course_id?: string | null
          created_at?: string
          detalhe?: string
          group_id?: string | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      assessment_attempts: {
        Row: {
          answers: Json
          assessment_id: string
          attempt_number: number
          completed_at: string | null
          correct_answers: number
          id: string
          passed: boolean
          score: number
          started_at: string
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number
          id?: string
          passed?: boolean
          score?: number
          started_at?: string
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number
          id?: string
          passed?: boolean
          score?: number
          started_at?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          created_at: string
          enunciado: string
          explicacao: string
          id: string
          module_id: string | null
          ordem: number
          peso: number
          status: Database["public"]["Enums"]["content_status"]
          tipo: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          enunciado?: string
          explicacao?: string
          id?: string
          module_id?: string | null
          ordem?: number
          peso?: number
          status?: Database["public"]["Enums"]["content_status"]
          tipo?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          enunciado?: string
          explicacao?: string
          id?: string
          module_id?: string | null
          ordem?: number
          peso?: number
          status?: Database["public"]["Enums"]["content_status"]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          descricao: string
          id: string
          instrucoes: string
          max_attempts: number | null
          passing_score: number
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          descricao?: string
          id?: string
          instrucoes?: string
          max_attempts?: number | null
          passing_score?: number
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          titulo?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          descricao?: string
          id?: string
          instrucoes?: string
          max_attempts?: number | null
          passing_score?: number
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          descricao: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_code: string
          completion_date: string
          course_id: string
          course_name: string
          created_at: string
          final_score: number
          id: string
          issued_at: string
          pdf_path: string | null
          student_name: string
          updated_at: string
          user_id: string
          verification_status: string
          workload_formatted: string
          workload_minutes: number
        }
        Insert: {
          certificate_code: string
          completion_date?: string
          course_id: string
          course_name: string
          created_at?: string
          final_score?: number
          id?: string
          issued_at?: string
          pdf_path?: string | null
          student_name: string
          updated_at?: string
          user_id: string
          verification_status?: string
          workload_formatted?: string
          workload_minutes?: number
        }
        Update: {
          certificate_code?: string
          completion_date?: string
          course_id?: string
          course_name?: string
          created_at?: string
          final_score?: number
          id?: string
          issued_at?: string
          pdf_path?: string | null
          student_name?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
          workload_formatted?: string
          workload_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          capa_url: string | null
          category_id: string | null
          created_at: string
          descricao: string
          destaque: boolean
          id: string
          publicado: boolean
          status: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at: string
          visibility: Database["public"]["Enums"]["course_visibility"]
        }
        Insert: {
          capa_url?: string | null
          category_id?: string | null
          created_at?: string
          descricao?: string
          destaque?: boolean
          id?: string
          publicado?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Update: {
          capa_url?: string | null
          category_id?: string | null
          created_at?: string
          descricao?: string
          destaque?: boolean
          id?: string
          publicado?: boolean
          status?: Database["public"]["Enums"]["content_status"]
          titulo?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_block_id: string | null
          mime_type: string
          nome: string
          path: string | null
          tamanho: number | null
          tipo: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_block_id?: string | null
          mime_type?: string
          nome: string
          path?: string | null
          tamanho?: number | null
          tipo?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_block_id?: string | null
          mime_type?: string
          nome?: string
          path?: string | null
          tamanho?: number | null
          tipo?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_lesson_block_id_fkey"
            columns: ["lesson_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      group_courses: {
        Row: {
          course_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_blocks: {
        Row: {
          conteudo: Json
          count_for_workload: boolean
          created_at: string
          duration_seconds: number | null
          estimated_duration_seconds: number | null
          id: string
          lesson_id: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          conteudo?: Json
          count_for_workload?: boolean
          created_at?: string
          duration_seconds?: number | null
          estimated_duration_seconds?: number | null
          id?: string
          lesson_id: string
          ordem?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          conteudo?: Json
          count_for_workload?: boolean
          created_at?: string
          duration_seconds?: number | null
          estimated_duration_seconds?: number | null
          id?: string
          lesson_id?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          descricao: string
          id: string
          module_id: string
          ordem: number
          status: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          module_id: string
          ordem?: number
          status?: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          module_id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["content_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_lessons: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          module_id: string
          obrigatorio: boolean
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          module_id: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          module_id?: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          descricao: string
          id: string
          ordem: number
          status: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["content_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["content_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          last_accessed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      question_answers: {
        Row: {
          option_id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          option_id: string
          question_id: string
          updated_at?: string
        }
        Update: {
          option_id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          ordem: number
          question_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          question_id: string
          texto?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          question_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_module_averages: {
        Args: never
        Returns: {
          avg_percent: number
          module_id: string
          ordem: number
          titulo: string
          total_lessons: number
        }[]
      }
      admin_student_overview: {
        Args: never
        Returns: {
          completed_lessons: number
          current_module_completed: number
          current_module_id: string
          current_module_ordem: number
          current_module_titulo: string
          current_module_total: number
          email: string
          last_access: string
          last_lesson_titulo: string
          nome: string
          total_lessons: number
          user_id: string
        }[]
      }
      can_access_course: { Args: { _course_id: string }; Returns: boolean }
      course_completion_status: {
        Args: { _course_id: string }
        Returns: {
          assessment_id: string
          attempts_used: number
          best_score: number
          certificate_id: string
          completed_lessons: number
          content_done: boolean
          max_attempts: number
          passed: boolean
          passing_score: number
          total_lessons: number
          workload_seconds: number
        }[]
      }
      course_workload_breakdown: {
        Args: { _course_id: string }
        Returns: {
          module_id: string
          ordem: number
          seconds: number
          titulo: string
        }[]
      }
      course_workload_seconds: { Args: { _course_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      lesson_workload_seconds: { Args: { _lesson_id: string }; Returns: number }
      submit_assessment: {
        Args: { _answers: Json; _assessment_id: string }
        Returns: {
          attempt_id: string
          attempt_number: number
          correct_answers: number
          passed: boolean
          score: number
          total_questions: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "aluno"
      content_status: "rascunho" | "publicado" | "arquivado"
      course_visibility: "publico" | "restrito"
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
      app_role: ["admin", "aluno"],
      content_status: ["rascunho", "publicado", "arquivado"],
      course_visibility: ["publico", "restrito"],
    },
  },
} as const
