/**
 * Tipos de la base de Supabase — escritos a mano, PARCIALES a propósito.
 *
 * Solo cubre las tablas que el código de la app ya consulta (biblioteca de
 * ejercicios + identidad/dashboard del profesor + plan builder). El esquema
 * real tiene ~30 tablas (ver supabase/migrations/ y
 * docs/auditoria-03-arquitectura-objetivo.md); no tiene sentido escribir a
 * mano el resto hasta que algo las use de verdad.
 *
 * `Relationships` en cada tabla es la metadata de foreign keys que
 * @supabase/postgrest-js exige para que el tipo satisfaga `GenericSchema`
 * (sin esto, TODO el cliente tipado colapsa a `never` en selects/inserts/
 * updates — no es solo necesario para resolver selects anidados). Reflejan
 * las FKs reales creadas en supabase/migrations/.
 *
 * Reemplazar por la salida real de:
 *   supabase gen types typescript --linked > lib/supabase/database.types.ts
 * (instrucciones en docs/fase-1-supabase-setup.md) apenas el proyecto esté
 * linkeado — mismo shape, así que no debería romper nada de lo que ya
 * consume este archivo.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      muscles: {
        Row: {
          id: string
          canonical_name: string
          display_name: string
          sort_order: number | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['muscles']['Row']>
        Update: Partial<Database['public']['Tables']['muscles']['Row']>
        Relationships: []
      }
      sports: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['sports']['Row']>
        Update: Partial<Database['public']['Tables']['sports']['Row']>
        Relationships: []
      }
      exercise_sports: {
        Row: {
          exercise_id: string
          sport_id: string
        }
        Insert: Partial<Database['public']['Tables']['exercise_sports']['Row']>
        Update: Partial<Database['public']['Tables']['exercise_sports']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercise_sports_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_sports_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      patterns: {
        Row: {
          id: string
          canonical_name: string
          display_name: string
          sort_order: number | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['patterns']['Row']>
        Update: Partial<Database['public']['Tables']['patterns']['Row']>
        Relationships: []
      }
      stimulus_types: {
        Row: {
          id: string
          canonical_name: string
          display_name: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['stimulus_types']['Row']>
        Update: Partial<Database['public']['Tables']['stimulus_types']['Row']>
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          canonical_name: string
          display_name: string
          original_name: string
          description: string | null
          instructions: string | null
          common_errors: string | null
          difficulty: 'principiante' | 'intermedio' | 'avanzado' | null
          muscle_id: string | null
          pattern_id: string | null
          source: 'base_original' | 'nuevo_profe'
          match_status:
            | 'coincidencia_exacta'
            | 'coincidencia_probable'
            | 'aproximado_revisar'
            | 'ambiguo'
            | 'sin_video_encontrado'
            | null
          status: 'active' | 'pending_review' | 'archived'
          proposed_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          added_by: string | null
          owner_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['exercises']['Row']>
        Update: Partial<Database['public']['Tables']['exercises']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercises_muscle_id_fkey'
            columns: ['muscle_id']
            isOneToOne: false
            referencedRelation: 'muscles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercises_pattern_id_fkey'
            columns: ['pattern_id']
            isOneToOne: false
            referencedRelation: 'patterns'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_stimulus_types: {
        Row: { exercise_id: string; stimulus_type_id: string }
        Insert: Database['public']['Tables']['exercise_stimulus_types']['Row']
        Update: Partial<Database['public']['Tables']['exercise_stimulus_types']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercise_stimulus_types_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_stimulus_types_stimulus_type_id_fkey'
            columns: ['stimulus_type_id']
            isOneToOne: false
            referencedRelation: 'stimulus_types'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_aliases: {
        Row: {
          id: string
          exercise_id: string
          alias: string
          note: string | null
        }
        Insert: Partial<Database['public']['Tables']['exercise_aliases']['Row']>
        Update: Partial<Database['public']['Tables']['exercise_aliases']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercise_aliases_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_change_requests: {
        Row: {
          id: string
          exercise_id: string
          requested_by: string
          proposed: Json
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['exercise_change_requests']['Row']>
        Update: Partial<Database['public']['Tables']['exercise_change_requests']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercise_change_requests_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_media: {
        Row: {
          id: string
          exercise_id: string | null
          activity_id: string | null
          type: 'video' | 'image' | 'thumbnail' | 'instruction'
          url: string
          source: string
          title: string | null
          is_primary: boolean
          sort_order: number
          status: 'active' | 'archived'
        }
        Insert: Partial<Database['public']['Tables']['exercise_media']['Row']>
        Update: Partial<Database['public']['Tables']['exercise_media']['Row']>
        Relationships: [
          {
            foreignKeyName: 'exercise_media_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: 'professor' | 'student' | 'individual' | 'admin'
          full_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      professors: {
        Row: { id: string; bio: string | null; is_approver: boolean; created_at: string }
        Insert: Partial<Database['public']['Tables']['professors']['Row']>
        Update: Partial<Database['public']['Tables']['professors']['Row']>
        Relationships: [
          {
            foreignKeyName: 'professors_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      students: {
        Row: {
          id: string
          level: string | null
          primary_sport_id: string | null
          availability: string | null
          equipment_access: string | null
          notes: string | null
          status: 'active' | 'inactive'
          created_at: string
          username: string | null
          phone: string | null
        }
        Insert: Partial<Database['public']['Tables']['students']['Row']>
        Update: Partial<Database['public']['Tables']['students']['Row']>
        Relationships: [
          {
            foreignKeyName: 'students_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      student_professors: {
        Row: {
          student_id: string
          professor_id: string
          is_primary: boolean
          status: 'active' | 'invited' | 'ended'
          permission_level: 'full' | 'view_only'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['student_professors']['Row']>
        Update: Partial<Database['public']['Tables']['student_professors']['Row']>
        Relationships: [
          {
            foreignKeyName: 'student_professors_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_professors_professor_id_fkey'
            columns: ['professor_id']
            isOneToOne: false
            referencedRelation: 'professors'
            referencedColumns: ['id']
          },
        ]
      }
      student_load_targets: {
        Row: {
          student_id: string
          group_type: 'pattern' | 'muscle'
          group_id: string
          target_weekly_series: number | null
          target_intensity: number | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['student_load_targets']['Row']>
        Update: Partial<Database['public']['Tables']['student_load_targets']['Row']>
        Relationships: [
          {
            foreignKeyName: 'student_load_targets_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          student_id: string
          professor_id: string | null
          sport_id: string | null
          sport_profile_id: string | null
          objective: string | null
          level: string | null
          plan_type: 'MUSCLE' | 'PATTERN' | 'MIXED' | 'SPORT_SPECIFIC' | 'CUSTOM'
          start_date: string | null
          end_date: string | null
          frequency_per_week: number | null
          status: 'draft' | 'active' | 'completed' | 'archived'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['plans']['Row']>
        Update: Partial<Database['public']['Tables']['plans']['Row']>
        Relationships: [
          {
            foreignKeyName: 'plans_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plans_professor_id_fkey'
            columns: ['professor_id']
            isOneToOne: false
            referencedRelation: 'professors'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          id: string
          week_id: string
          student_id: string
          professor_id: string | null
          sport_id: string | null
          competition_id: string | null
          name: string
          date: string | null
          estimated_duration_min: number | null
          type: string | null
          objective: string | null
          order: number
          status: 'scheduled' | 'completed' | 'skipped'
        }
        Insert: Partial<Database['public']['Tables']['workouts']['Row']>
        Update: Partial<Database['public']['Tables']['workouts']['Row']>
        Relationships: [
          {
            foreignKeyName: 'workouts_week_id_fkey'
            columns: ['week_id']
            isOneToOne: false
            referencedRelation: 'plan_weeks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_professor_id_fkey'
            columns: ['professor_id']
            isOneToOne: false
            referencedRelation: 'professors'
            referencedColumns: ['id']
          },
        ]
      }
      plan_phases: {
        Row: {
          id: string
          plan_id: string
          name: string
          kind:
            | 'preparacion_general'
            | 'preparacion_especifica'
            | 'competencia'
            | 'puesta_a_punto'
            | 'transicion'
            | 'recuperacion'
            | 'pretemporada'
            | 'temporada'
            | 'custom'
            | null
          start_date: string | null
          end_date: string | null
          order: number
        }
        Insert: Partial<Database['public']['Tables']['plan_phases']['Row']>
        Update: Partial<Database['public']['Tables']['plan_phases']['Row']>
        Relationships: [
          {
            foreignKeyName: 'plan_phases_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
        ]
      }
      plan_weeks: {
        Row: {
          id: string
          plan_id: string
          phase_id: string | null
          number: number
          name: string | null
          start_date: string | null
          end_date: string | null
          objective: string | null
          notes: string | null
        }
        Insert: Partial<Database['public']['Tables']['plan_weeks']['Row']>
        Update: Partial<Database['public']['Tables']['plan_weeks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'plan_weeks_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
        ]
      }
      workout_blocks: {
        Row: {
          id: string
          workout_id: string
          kind:
            | 'INDIVIDUAL'
            | 'COMBINADO'
            | 'CIRCUITO'
            | 'CALENTAMIENTO'
            | 'ACTIVACION'
            | 'MOVILIDAD'
            | 'RECUPERACION'
            | 'TECNICA'
            | 'TACTICA'
          rounds: number | null
          rest_between_rounds_sec: number | null
          order: number
        }
        Insert: Partial<Database['public']['Tables']['workout_blocks']['Row']>
        Update: Partial<Database['public']['Tables']['workout_blocks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'workout_blocks_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      training_items: {
        Row: {
          id: string
          block_id: string
          kind: 'EXERCISE' | 'ACTIVITY'
          exercise_id: string | null
          activity_id: string | null
          activity_name: string | null
          label: string | null
          group_label: string | null
          order: number
        }
        Insert: Partial<Database['public']['Tables']['training_items']['Row']>
        Update: Partial<Database['public']['Tables']['training_items']['Row']>
        Relationships: [
          {
            foreignKeyName: 'training_items_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'workout_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_items_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      workout_prescriptions: {
        Row: {
          id: string
          training_item_id: string
          sets: string | null
          reps: string | null
          load_kg: number | null
          load_percent: number | null
          intensity_rpe: string | null
          rest_label: string | null
          time_sec: number | null
          distance_m: number | null
          pace: string | null
          tempo: string | null
          notes: string | null
          order: number
        }
        Insert: Partial<Database['public']['Tables']['workout_prescriptions']['Row']>
        Update: Partial<Database['public']['Tables']['workout_prescriptions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'workout_prescriptions_training_item_id_fkey'
            columns: ['training_item_id']
            isOneToOne: true
            referencedRelation: 'training_items'
            referencedColumns: ['id']
          },
        ]
      }
      forms: {
        Row: {
          id: string
          professor_id: string | null
          name: string
          description: string | null
          status: 'draft' | 'published' | 'archived'
          is_template: boolean
          template_source_id: string | null
          created_at: string
          archived_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['forms']['Row']>
        Update: Partial<Database['public']['Tables']['forms']['Row']>
        Relationships: []
      }
      form_sports: {
        Row: { form_id: string; sport_id: string }
        Insert: Partial<Database['public']['Tables']['form_sports']['Row']>
        Update: Partial<Database['public']['Tables']['form_sports']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_sports_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'form_sports_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      form_sections: {
        Row: {
          id: string
          form_id: string
          order: number
          title: string | null
          description: string | null
          sensitive: boolean
        }
        Insert: Partial<Database['public']['Tables']['form_sections']['Row']>
        Update: Partial<Database['public']['Tables']['form_sections']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_sections_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_questions: {
        Row: {
          id: string
          form_id: string
          section_id: string
          order: number
          type:
            | 'short_text'
            | 'long_text'
            | 'number'
            | 'date'
            | 'birth_date'
            | 'single_select'
            | 'multi_select'
            | 'scale'
            | 'yes_no'
            | 'weight'
            | 'height'
            | 'duration'
            | 'distance'
            | 'pace'
            | 'file'
            | 'video'
          label: string
          help_text: string | null
          required: boolean
          sensitive: boolean
          config: Json
        }
        Insert: Partial<Database['public']['Tables']['form_questions']['Row']>
        Update: Partial<Database['public']['Tables']['form_questions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_questions_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_question_options: {
        Row: {
          id: string
          question_id: string
          form_id: string
          order: number
          value: string
          label: string
        }
        Insert: Partial<Database['public']['Tables']['form_question_options']['Row']>
        Update: Partial<Database['public']['Tables']['form_question_options']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_question_options_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_rules: {
        Row: {
          id: string
          form_id: string
          order: number
          when: Json
          match: 'all' | 'any'
          action: 'show' | 'hide' | 'require' | 'skip_to'
          target: Json
        }
        Insert: Partial<Database['public']['Tables']['form_rules']['Row']>
        Update: Partial<Database['public']['Tables']['form_rules']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_rules_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_versions: {
        Row: {
          id: string
          form_id: string
          version: number
          structure: Json
          published_by: string | null
          published_at: string
        }
        Insert: Partial<Database['public']['Tables']['form_versions']['Row']>
        Update: Partial<Database['public']['Tables']['form_versions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_versions_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_submissions: {
        Row: {
          id: string
          form_id: string
          form_version_id: string
          professor_id: string
          student_id: string | null
          invitee_name: string | null
          invitee_contact: string | null
          token: string
          status: 'pending' | 'started' | 'completed' | 'expired'
          progress: Json
          consent_accepted_at: string | null
          started_at: string | null
          completed_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['form_submissions']['Row']>
        Update: Partial<Database['public']['Tables']['form_submissions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_submissions_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'forms'
            referencedColumns: ['id']
          },
        ]
      }
      form_answers: {
        Row: {
          id: string
          submission_id: string
          question_id: string
          question_type: string
          value: Json | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['form_answers']['Row']>
        Update: Partial<Database['public']['Tables']['form_answers']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_answers_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'form_submissions'
            referencedColumns: ['id']
          },
        ]
      }
      form_answer_files: {
        Row: {
          id: string
          answer_id: string
          storage_path: string
          filename: string | null
          mime: string | null
          size_bytes: number | null
        }
        Insert: Partial<Database['public']['Tables']['form_answer_files']['Row']>
        Update: Partial<Database['public']['Tables']['form_answer_files']['Row']>
        Relationships: []
      }
      form_submission_summaries: {
        Row: {
          id: string
          submission_id: string
          summary: Json
          model: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['form_submission_summaries']['Row']>
        Update: Partial<Database['public']['Tables']['form_submission_summaries']['Row']>
        Relationships: [
          {
            foreignKeyName: 'form_submission_summaries_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'form_submissions'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      apply_exercise_change_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      save_workout_day: {
        Args: { p_workout_id: string; p_blocks: Json }
        Returns: void
      }
      save_week_days: {
        Args: { p_days: Json }
        Returns: void
      }
      duplicate_workout: {
        Args: {
          p_source_workout_id: string
          p_target_week_id: string
          p_name: string
          p_order: number
          p_shift_siblings?: boolean
        }
        Returns: string
      }
      duplicate_plan_week: {
        Args: { p_source_week_id: string; p_new_number: number; p_new_name: string }
        Returns: string
      }
      publish_form: {
        Args: { p_form_id: string }
        Returns: string
      }
      create_form_from_template: {
        Args: { p_template_id: string }
        Returns: string
      }
      duplicate_form: {
        Args: { p_form_id: string }
        Returns: string
      }
      save_form_as_template: {
        Args: { p_form_id: string }
        Returns: string
      }
      get_submission: {
        Args: { p_token: string }
        Returns: Json
      }
      start_submission: {
        Args: { p_token: string }
        Returns: undefined
      }
      save_submission_answers: {
        Args: { p_token: string; p_answers: Json; p_progress?: Json }
        Returns: undefined
      }
      complete_submission: {
        Args: { p_token: string; p_consent?: boolean }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
