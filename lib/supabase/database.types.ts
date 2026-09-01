/**
 * Tipos de la base de Supabase — escritos a mano, PARCIALES a propósito.
 *
 * Solo cubre las tablas que el código de la app ya consulta (biblioteca de
 * ejercicios + identidad/dashboard del profesor). El esquema real tiene
 * ~30 tablas (ver supabase/migrations/ y
 * docs/auditoria-03-arquitectura-objetivo.md); no tiene sentido escribir a
 * mano el resto hasta que algo las use de verdad.
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
      }
      exercise_stimulus_types: {
        Row: { exercise_id: string; stimulus_type_id: string }
        Insert: Database['public']['Tables']['exercise_stimulus_types']['Row']
        Update: Partial<Database['public']['Tables']['exercise_stimulus_types']['Row']>
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
      }
      professors: {
        Row: { id: string; bio: string | null; is_approver: boolean; created_at: string }
        Insert: Partial<Database['public']['Tables']['professors']['Row']>
        Update: Partial<Database['public']['Tables']['professors']['Row']>
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
      }
    }
  }
}
