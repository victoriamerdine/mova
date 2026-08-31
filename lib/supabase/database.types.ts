/**
 * Tipos de la base de Supabase — escritos a mano, PARCIALES a propósito.
 *
 * Solo cubre las tablas que el código de la app ya consulta (biblioteca de
 * ejercicios). El esquema real tiene 30 tablas (ver supabase/migrations/ y
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
    }
  }
}
