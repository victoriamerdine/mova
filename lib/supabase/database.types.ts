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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
