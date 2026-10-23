
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "daily_activity": {
                  Row: {
                    "answers": number,"chat_turns": number,"local_date": string,"reviews": number,"user_id": string,"xp": number,"xp_quiz": number,"xp_review": number
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: number,"chat_turns"?: number,"local_date": string,"reviews"?: number,"user_id": string,"xp"?: number,"xp_quiz"?: number,"xp_review"?: number
                  }
                  Update: {
                    "answers"?: number,"chat_turns"?: number,"local_date"?: string,"reviews"?: number,"user_id"?: string,"xp"?: number,"xp_quiz"?: number,"xp_review"?: number
                  }
                  Relationships: [
                    
                  ]
                },"level_thresholds": {
                  Row: {
                    "level": number,"xp_required": number
                  }
                  ComputedFields: never
                  Insert: {
                    "level": number,"xp_required": number
                  }
                  Update: {
                    "level"?: number,"xp_required"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_key": string,"coins": number,"created_at": string,"display_name": string | null,"id": string,"level": number,"onboarded_at": string | null,"placement_level": Database["public"]['Enums']["cefr_level"] | null,"position": NonNullable<Json>,"rank": Database["public"]['Enums']["career_rank"],"streak_current": number,"streak_freezes": number,"streak_last_date": string | null,"streak_longest": number,"target_level": Database["public"]['Enums']["cefr_level"],"timezone": string,"ui_locale": string,"updated_at": string,"xp_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_key"?: string,"coins"?: number,"created_at"?: string,"display_name"?: string | null,"id": string,"level"?: number,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"position"?: NonNullable<Json>,"rank"?: Database["public"]['Enums']["career_rank"],"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Update: {
                    "avatar_key"?: string,"coins"?: number,"created_at"?: string,"display_name"?: string | null,"id"?: string,"level"?: number,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"position"?: NonNullable<Json>,"rank"?: Database["public"]['Enums']["career_rank"],"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Relationships: [
                    
                  ]
                },"sources": {
                  Row: {
                    "attribution_text": string,"commercial_ok": boolean,"id": number,"license_spdx": string,"license_url": string | null,"name": string,"notes": string | null,"retrieved_at": string | null,"sha256": string | null,"share_alike": boolean,"slug": string,"url": string | null,"version": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attribution_text": string,"commercial_ok": boolean,"id"?: number,"license_spdx": string,"license_url"?: string | null,"name": string,"notes"?: string | null,"retrieved_at"?: string | null,"sha256"?: string | null,"share_alike": boolean,"slug": string,"url"?: string | null,"version"?: string | null
                  }
                  Update: {
                    "attribution_text"?: string,"commercial_ok"?: boolean,"id"?: number,"license_spdx"?: string,"license_url"?: string | null,"name"?: string,"notes"?: string | null,"retrieved_at"?: string | null,"sha256"?: string | null,"share_alike"?: boolean,"slug"?: string,"url"?: string | null,"version"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"xp_events": {
                  Row: {
                    "amount": number,"created_at": string,"id": number,"idempotency_key": string,"local_date": string,"metadata": NonNullable<Json>,"reason": Database["public"]['Enums']["xp_reason"],"ref_id": string | null,"ref_type": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: number,"idempotency_key": string,"local_date": string,"metadata"?: NonNullable<Json>,"reason": Database["public"]['Enums']["xp_reason"],"ref_id"?: string | null,"ref_type"?: string | null,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: number,"idempotency_key"?: string,"local_date"?: string,"metadata"?: NonNullable<Json>,"reason"?: Database["public"]['Enums']["xp_reason"],"ref_id"?: string | null,"ref_type"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"svc_award_xp":
{ Args: { "p_amount": number,"p_coins"?: number,"p_key": string,"p_metadata"?: Json,"p_reason": Database["public"]['Enums']["xp_reason"],"p_ref_id"?: string,"p_ref_type"?: string,"p_user": string }; Returns: Json
                           },
"svc_save_position":
{ Args: { "p_position": Json,"p_user": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "editor"|"admin","career_rank": "intern"|"junior"|"mid"|"senior"|"techlead","cefr_level": "A1"|"A2"|"B1"|"B2"|"C1","xp_reason": "quiz_correct"|"daily_learn"|"daily_complete"|"review"|"dialogue_complete"|"minigame_complete"|"chat_session"|"quest_reward"|"achievement_reward"|"boss_pass"|"streak_bonus"|"admin_adjust"|"merge"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["editor", "admin"],"career_rank": ["intern", "junior", "mid", "senior", "techlead"],"cefr_level": ["A1", "A2", "B1", "B2", "C1"],"xp_reason": ["quiz_correct", "daily_learn", "daily_complete", "review", "dialogue_complete", "minigame_complete", "chat_session", "quest_reward", "achievement_reward", "boss_pass", "streak_bonus", "admin_adjust", "merge"]
          }
        }
} as const
