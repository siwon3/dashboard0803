import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          deadline: string | null
          assignee: string | null
          column_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          deadline?: string | null
          assignee?: string | null
          column_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          deadline?: string | null
          assignee?: string | null
          column_id?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          target_traffic: number | null
          target_conversion: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          target_traffic?: number | null
          target_conversion?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          target_traffic?: number | null
          target_conversion?: number | null
          updated_at?: string
        }
      }
    }
  }
}
