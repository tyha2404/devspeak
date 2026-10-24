
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
            "api_usage": {
                  Row: {
                    "batch_id": string | null,"cache_read_tokens": number,"cache_write_tokens": number,"cost_usd_micros": number,"created_at": string,"feature": string,"id": number,"input_tokens": number,"latency_ms": number | null,"model": string,"output_tokens": number,"request_id": string | null,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd_micros"?: number,"created_at"?: string,"feature": string,"id"?: number,"input_tokens"?: number,"latency_ms"?: number | null,"model": string,"output_tokens"?: number,"request_id"?: string | null,"status": string,"user_id"?: string | null
                  }
                  Update: {
                    "batch_id"?: string | null,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd_micros"?: number,"created_at"?: string,"feature"?: string,"id"?: number,"input_tokens"?: number,"latency_ms"?: number | null,"model"?: string,"output_tokens"?: number,"request_id"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"chat_messages": {
                  Row: {
                    "content": string,"created_at": string,"feedback": Json | null,"flagged": boolean,"id": number,"role": string,"session_id": string,"stop_reason": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"feedback"?: Json | null,"flagged"?: boolean,"id"?: number,"role": string,"session_id": string,"stop_reason"?: string | null,"user_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"feedback"?: Json | null,"flagged"?: boolean,"id"?: number,"role"?: string,"session_id"?: string,"stop_reason"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_messages_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "chat_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_sessions": {
                  Row: {
                    "break_attempts": number,"cost_usd_micros": number,"ended_at": string | null,"goal_progress": number,"id": string,"input_tokens": number,"model": string,"npc_id": string,"output_tokens": number,"prompt_version": string,"scenario_id": string,"started_at": string,"status": string,"summary": string | null,"turn_count": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "break_attempts"?: number,"cost_usd_micros"?: number,"ended_at"?: string | null,"goal_progress"?: number,"id"?: string,"input_tokens"?: number,"model": string,"npc_id": string,"output_tokens"?: number,"prompt_version": string,"scenario_id": string,"started_at"?: string,"status"?: string,"summary"?: string | null,"turn_count"?: number,"user_id": string
                  }
                  Update: {
                    "break_attempts"?: number,"cost_usd_micros"?: number,"ended_at"?: string | null,"goal_progress"?: number,"id"?: string,"input_tokens"?: number,"model"?: string,"npc_id"?: string,"output_tokens"?: number,"prompt_version"?: string,"scenario_id"?: string,"started_at"?: string,"status"?: string,"summary"?: string | null,"turn_count"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"coin_events": {
                  Row: {
                    "amount": number,"created_at": string,"id": number,"idempotency_key": string,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: number,"idempotency_key": string,"reason": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: number,"idempotency_key"?: string,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cron_runs": {
                  Row: {
                    "detail": Json | null,"finished_at": string | null,"job": string,"ok": boolean | null,"run_key": string,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "detail"?: Json | null,"finished_at"?: string | null,"job": string,"ok"?: boolean | null,"run_key": string,"started_at"?: string
                  }
                  Update: {
                    "detail"?: Json | null,"finished_at"?: string | null,"job"?: string,"ok"?: boolean | null,"run_key"?: string,"started_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"daily_activity": {
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
                },"dialogue_runs": {
                  Row: {
                    "completed_at": string | null,"current_node": string,"dialogue_id": string,"dialogue_version": number,"id": string,"path": NonNullable<Json>,"quiz_session_id": string | null,"score": number,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"current_node": string,"dialogue_id": string,"dialogue_version": number,"id"?: string,"path"?: NonNullable<Json>,"quiz_session_id"?: string | null,"score"?: number,"started_at"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"current_node"?: string,"dialogue_id"?: string,"dialogue_version"?: number,"id"?: string,"path"?: NonNullable<Json>,"quiz_session_id"?: string | null,"score"?: number,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dialogue_runs_dialogue_id_fkey"
      columns: ["dialogue_id"]
isOneToOne: false
      referencedRelation: "dialogues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dialogue_runs_quiz_session_id_fkey"
      columns: ["quiz_session_id"]
isOneToOne: false
      referencedRelation: "quiz_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"dialogues": {
                  Row: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"graph": NonNullable<Json>,"id": string,"npc_id": string,"origin": Database["public"]['Enums']["content_origin"],"slug": string,"sort_order": number,"source_id": number,"status": Database["public"]['Enums']["content_status"],"title_en": string,"title_vi": string,"unlock_level": number,"version": number,"xp_reward": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"graph": NonNullable<Json>,"id"?: string,"npc_id": string,"origin": Database["public"]['Enums']["content_origin"],"slug": string,"sort_order"?: number,"source_id": number,"status"?: Database["public"]['Enums']["content_status"],"title_en": string,"title_vi": string,"unlock_level"?: number,"version"?: number,"xp_reward"?: number
                  }
                  Update: {
                    "cefr"?: Database["public"]['Enums']["cefr_level"],"graph"?: NonNullable<Json>,"id"?: string,"npc_id"?: string,"origin"?: Database["public"]['Enums']["content_origin"],"slug"?: string,"sort_order"?: number,"source_id"?: number,"status"?: Database["public"]['Enums']["content_status"],"title_en"?: string,"title_vi"?: string,"unlock_level"?: number,"version"?: number,"xp_reward"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dialogues_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"examples": {
                  Row: {
                    "audio_author": string | null,"audio_license": string | null,"audio_url": string | null,"id": number,"sense_id": number,"source_id": number,"source_ref": string | null,"text_en": string,"text_vi": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_author"?: string | null,"audio_license"?: string | null,"audio_url"?: string | null,"id"?: number,"sense_id": number,"source_id": number,"source_ref"?: string | null,"text_en": string,"text_vi"?: string | null
                  }
                  Update: {
                    "audio_author"?: string | null,"audio_license"?: string | null,"audio_url"?: string | null,"id"?: number,"sense_id"?: number,"source_id"?: number,"source_ref"?: string | null,"text_en"?: string,"text_vi"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "examples_sense_id_fkey"
      columns: ["sense_id"]
isOneToOne: false
      referencedRelation: "senses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examples_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"generation_items": {
                  Row: {
                    "attempts": number,"custom_id": string,"error": string | null,"job_id": string,"result_question_ids": (string)[],"status": string,"target": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"custom_id": string,"error"?: string | null,"job_id": string,"result_question_ids"?: (string)[],"status"?: string,"target": NonNullable<Json>
                  }
                  Update: {
                    "attempts"?: number,"custom_id"?: string,"error"?: string | null,"job_id"?: string,"result_question_ids"?: (string)[],"status"?: string,"target"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "generation_items_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "generation_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"generation_jobs": {
                  Row: {
                    "anthropic_batch_id": string | null,"created_at": string,"created_by": string | null,"ended_at": string | null,"errored": number,"id": string,"ingested_at": string | null,"kind": string,"last_error": string | null,"model": string,"params": NonNullable<Json>,"prompt_version": string,"request_count": number,"status": string,"submitted_at": string | null,"succeeded": number
                  }
                  ComputedFields: never
                  Insert: {
                    "anthropic_batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"errored"?: number,"id"?: string,"ingested_at"?: string | null,"kind": string,"last_error"?: string | null,"model": string,"params"?: NonNullable<Json>,"prompt_version": string,"request_count"?: number,"status"?: string,"submitted_at"?: string | null,"succeeded"?: number
                  }
                  Update: {
                    "anthropic_batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"errored"?: number,"id"?: string,"ingested_at"?: string | null,"kind"?: string,"last_error"?: string | null,"model"?: string,"params"?: NonNullable<Json>,"prompt_version"?: string,"request_count"?: number,"status"?: string,"submitted_at"?: string | null,"succeeded"?: number
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
                },"lexemes": {
                  Row: {
                    "cefr": Database["public"]['Enums']["cefr_level"] | null,"cefr_confidence": string | null,"cefr_source": string | null,"created_at": string,"display": string,"id": number,"ipa": string | null,"is_it_term": boolean,"it_level": string | null,"kind": string,"ngsl_rank": number | null,"normalized": string,"pos": string,"source_id": number,"zipf": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr"?: Database["public"]['Enums']["cefr_level"] | null,"cefr_confidence"?: string | null,"cefr_source"?: string | null,"created_at"?: string,"display": string,"id"?: number,"ipa"?: string | null,"is_it_term"?: boolean,"it_level"?: string | null,"kind"?: string,"ngsl_rank"?: number | null,"normalized": string,"pos": string,"source_id": number,"zipf"?: number | null
                  }
                  Update: {
                    "cefr"?: Database["public"]['Enums']["cefr_level"] | null,"cefr_confidence"?: string | null,"cefr_source"?: string | null,"created_at"?: string,"display"?: string,"id"?: number,"ipa"?: string | null,"is_it_term"?: boolean,"it_level"?: string | null,"kind"?: string,"ngsl_rank"?: number | null,"normalized"?: string,"pos"?: string,"source_id"?: number,"zipf"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lexemes_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"diff": Json | null,"entity": string,"entity_id": string,"id": number,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"diff"?: Json | null,"entity": string,"entity_id": string,"id"?: number,"reason"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"diff"?: Json | null,"entity"?: string,"entity_id"?: string,"id"?: number,"reason"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_key": string,"coins": number,"created_at": string,"display_name": string | null,"id": string,"leaderboard_opt_out": boolean,"level": number,"onboarded_at": string | null,"placement_level": Database["public"]['Enums']["cefr_level"] | null,"position": NonNullable<Json>,"rank": Database["public"]['Enums']["career_rank"],"streak_current": number,"streak_freezes": number,"streak_last_date": string | null,"streak_longest": number,"target_level": Database["public"]['Enums']["cefr_level"],"timezone": string,"ui_locale": string,"updated_at": string,"xp_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_key"?: string,"coins"?: number,"created_at"?: string,"display_name"?: string | null,"id": string,"leaderboard_opt_out"?: boolean,"level"?: number,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"position"?: NonNullable<Json>,"rank"?: Database["public"]['Enums']["career_rank"],"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Update: {
                    "avatar_key"?: string,"coins"?: number,"created_at"?: string,"display_name"?: string | null,"id"?: string,"leaderboard_opt_out"?: boolean,"level"?: number,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"position"?: NonNullable<Json>,"rank"?: Database["public"]['Enums']["career_rank"],"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Relationships: [
                    
                  ]
                },"question_deliveries": {
                  Row: {
                    "answered_at": string | null,"attempts": number,"client_prompt": NonNullable<Json>,"correct": boolean | null,"expires_at": string,"hint_used": boolean,"id": string,"option_map": Json | null,"question_id": string,"question_version_id": string,"served_at": string,"session_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"attempts"?: number,"client_prompt"?: NonNullable<Json>,"correct"?: boolean | null,"expires_at": string,"hint_used"?: boolean,"id"?: string,"option_map"?: Json | null,"question_id": string,"question_version_id": string,"served_at"?: string,"session_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "answered_at"?: string | null,"attempts"?: number,"client_prompt"?: NonNullable<Json>,"correct"?: boolean | null,"expires_at"?: string,"hint_used"?: boolean,"id"?: string,"option_map"?: Json | null,"question_id"?: string,"question_version_id"?: string,"served_at"?: string,"session_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_deliveries_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_deliveries_question_version_id_fkey"
      columns: ["question_version_id"]
isOneToOne: false
      referencedRelation: "question_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_deliveries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "quiz_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"question_reports": {
                  Row: {
                    "created_at": string,"id": number,"note": string | null,"question_id": string,"reason": string,"resolved_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"note"?: string | null,"question_id": string,"reason": string,"resolved_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"note"?: string | null,"question_id"?: string,"reason"?: string,"resolved_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_reports_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"question_versions": {
                  Row: {
                    "answer": NonNullable<Json>,"content_hash": string,"created_at": string,"explanation_en": string | null,"explanation_vi": string | null,"generator": Json | null,"hint_vi": string | null,"id": string,"prompt": NonNullable<Json>,"qa_report": Json | null,"question_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"content_hash": string,"created_at"?: string,"explanation_en"?: string | null,"explanation_vi"?: string | null,"generator"?: Json | null,"hint_vi"?: string | null,"id"?: string,"prompt": NonNullable<Json>,"qa_report"?: Json | null,"question_id": string,"version": number
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"content_hash"?: string,"created_at"?: string,"explanation_en"?: string | null,"explanation_vi"?: string | null,"generator"?: Json | null,"hint_vi"?: string | null,"id"?: string,"prompt"?: NonNullable<Json>,"qa_report"?: Json | null,"question_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_versions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"correct_count": number,"created_at": string,"current_version_id": string | null,"id": string,"npc_id": string | null,"origin": Database["public"]['Enums']["content_origin"],"report_count": number,"sense_ids": (number)[],"served_count": number,"slug": string,"source_id": number,"status": Database["public"]['Enums']["content_status"],"topic": string | null,"type": Database["public"]['Enums']["question_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"correct_count"?: number,"created_at"?: string,"current_version_id"?: string | null,"id"?: string,"npc_id"?: string | null,"origin": Database["public"]['Enums']["content_origin"],"report_count"?: number,"sense_ids"?: (number)[],"served_count"?: number,"slug": string,"source_id": number,"status"?: Database["public"]['Enums']["content_status"],"topic"?: string | null,"type": Database["public"]['Enums']["question_type"]
                  }
                  Update: {
                    "cefr"?: Database["public"]['Enums']["cefr_level"],"correct_count"?: number,"created_at"?: string,"current_version_id"?: string | null,"id"?: string,"npc_id"?: string | null,"origin"?: Database["public"]['Enums']["content_origin"],"report_count"?: number,"sense_ids"?: (number)[],"served_count"?: number,"slug"?: string,"source_id"?: number,"status"?: Database["public"]['Enums']["content_status"],"topic"?: string | null,"type"?: Database["public"]['Enums']["question_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_current_version_fk"
      columns: ["current_version_id"]
isOneToOne: false
      referencedRelation: "question_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_sessions": {
                  Row: {
                    "answered_count": number,"correct_count": number,"finished_at": string | null,"id": string,"kind": string,"npc_id": string | null,"planned_count": number,"question_ids": (string)[],"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_count"?: number,"correct_count"?: number,"finished_at"?: string | null,"id"?: string,"kind": string,"npc_id"?: string | null,"planned_count": number,"question_ids": (string)[],"started_at"?: string,"user_id": string
                  }
                  Update: {
                    "answered_count"?: number,"correct_count"?: number,"finished_at"?: string | null,"id"?: string,"kind"?: string,"npc_id"?: string | null,"planned_count"?: number,"question_ids"?: (string)[],"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"count": number,"subject": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"count"?: number,"subject": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"count"?: number,"subject"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"review_logs": {
                  Row: {
                    "client_review_id": string,"difficulty_before": number | null,"duration_ms": number | null,"elapsed_days": number,"id": number,"rating": number,"reviewed_at": string,"scheduled_days": number,"sense_id": number,"stability_before": number | null,"state_before": Database["public"]['Enums']["srs_state"],"user_id": string,"verified_correct": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_review_id": string,"difficulty_before"?: number | null,"duration_ms"?: number | null,"elapsed_days": number,"id"?: number,"rating": number,"reviewed_at"?: string,"scheduled_days": number,"sense_id": number,"stability_before"?: number | null,"state_before": Database["public"]['Enums']["srs_state"],"user_id": string,"verified_correct"?: boolean | null
                  }
                  Update: {
                    "client_review_id"?: string,"difficulty_before"?: number | null,"duration_ms"?: number | null,"elapsed_days"?: number,"id"?: number,"rating"?: number,"reviewed_at"?: string,"scheduled_days"?: number,"sense_id"?: number,"stability_before"?: number | null,"state_before"?: Database["public"]['Enums']["srs_state"],"user_id"?: string,"verified_correct"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_logs_sense_id_fkey"
      columns: ["sense_id"]
isOneToOne: false
      referencedRelation: "senses"
      referencedColumns: ["id"]
    }
                  ]
                },"senses": {
                  Row: {
                    "content_hash": string | null,"created_at": string,"definition_en": string,"id": number,"keep_english_in_vi": boolean,"lexeme_id": number,"locked_by_review": boolean,"meaning_vi": string,"meaning_vi_source": string | null,"review_status": Database["public"]['Enums']["content_status"],"slug": string,"source_id": number,"topic": string | null,"vi_usage_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content_hash"?: string | null,"created_at"?: string,"definition_en": string,"id"?: number,"keep_english_in_vi"?: boolean,"lexeme_id": number,"locked_by_review"?: boolean,"meaning_vi": string,"meaning_vi_source"?: string | null,"review_status"?: Database["public"]['Enums']["content_status"],"slug": string,"source_id": number,"topic"?: string | null,"vi_usage_note"?: string | null
                  }
                  Update: {
                    "content_hash"?: string | null,"created_at"?: string,"definition_en"?: string,"id"?: number,"keep_english_in_vi"?: boolean,"lexeme_id"?: number,"locked_by_review"?: boolean,"meaning_vi"?: string,"meaning_vi_source"?: string | null,"review_status"?: Database["public"]['Enums']["content_status"],"slug"?: string,"source_id"?: number,"topic"?: string | null,"vi_usage_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "senses_lexeme_id_fkey"
      columns: ["lexeme_id"]
isOneToOne: false
      referencedRelation: "lexemes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "senses_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
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
                },"user_achievements": {
                  Row: {
                    "achievement_id": string,"unlocked_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievement_id": string,"unlocked_at"?: string,"user_id": string
                  }
                  Update: {
                    "achievement_id"?: string,"unlocked_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_answers": {
                  Row: {
                    "attempts": number,"created_at": string,"delivery_id": string,"id": number,"is_correct": boolean,"latency_ms": number,"question_id": string,"question_version_id": string,"response": NonNullable<Json>,"user_id": string,"xp_awarded": number
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts": number,"created_at"?: string,"delivery_id": string,"id"?: number,"is_correct": boolean,"latency_ms": number,"question_id": string,"question_version_id": string,"response": NonNullable<Json>,"user_id": string,"xp_awarded"?: number
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"delivery_id"?: string,"id"?: number,"is_correct"?: boolean,"latency_ms"?: number,"question_id"?: string,"question_version_id"?: string,"response"?: NonNullable<Json>,"user_id"?: string,"xp_awarded"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_answers_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: true
      referencedRelation: "question_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_answers_question_version_id_fkey"
      columns: ["question_version_id"]
isOneToOne: false
      referencedRelation: "question_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"user_cards": {
                  Row: {
                    "added_at": string,"added_via": string,"difficulty": number,"due": string,"elapsed_days": number,"lapses": number,"last_review": string | null,"learning_steps": number,"reps": number,"scheduled_days": number,"sense_id": number,"stability": number,"state": Database["public"]['Enums']["srs_state"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"added_via"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"reps"?: number,"scheduled_days"?: number,"sense_id": number,"stability"?: number,"state"?: Database["public"]['Enums']["srs_state"],"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"added_via"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"reps"?: number,"scheduled_days"?: number,"sense_id"?: number,"stability"?: number,"state"?: Database["public"]['Enums']["srs_state"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_cards_sense_id_fkey"
      columns: ["sense_id"]
isOneToOne: false
      referencedRelation: "senses"
      referencedColumns: ["id"]
    }
                  ]
                },"user_cosmetics": {
                  Row: {
                    "bought_at": string,"equipped": boolean,"item_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bought_at"?: string,"equipped"?: boolean,"item_id": string,"user_id": string
                  }
                  Update: {
                    "bought_at"?: string,"equipped"?: boolean,"item_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_daily_words": {
                  Row: {
                    "day": string,"learned_at": string | null,"sense_id": number,"slot": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"learned_at"?: string | null,"sense_id": number,"slot": number,"user_id": string
                  }
                  Update: {
                    "day"?: string,"learned_at"?: string | null,"sense_id"?: number,"slot"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_daily_words_sense_id_fkey"
      columns: ["sense_id"]
isOneToOne: false
      referencedRelation: "senses"
      referencedColumns: ["id"]
    }
                  ]
                },"user_quests": {
                  Row: {
                    "claimed_at": string | null,"completed_at": string | null,"goal": number,"kind": string,"period_key": string,"progress": number,"quest_key": string,"reward_coins": number,"reward_xp": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string | null,"completed_at"?: string | null,"goal": number,"kind": string,"period_key": string,"progress"?: number,"quest_key": string,"reward_coins"?: number,"reward_xp"?: number,"user_id": string
                  }
                  Update: {
                    "claimed_at"?: string | null,"completed_at"?: string | null,"goal"?: number,"kind"?: string,"period_key"?: string,"progress"?: number,"quest_key"?: string,"reward_coins"?: number,"reward_xp"?: number,"user_id"?: string
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
                },"user_word_skips": {
                  Row: {
                    "sense_id": number,"skipped_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "sense_id": number,"skipped_at"?: string,"user_id": string
                  }
                  Update: {
                    "sense_id"?: number,"skipped_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_word_skips_sense_id_fkey"
      columns: ["sense_id"]
isOneToOne: false
      referencedRelation: "senses"
      referencedColumns: ["id"]
    }
                  ]
                },"word_forms": {
                  Row: {
                    "form": string,"kind": string,"lexeme_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "form": string,"kind"?: string,"lexeme_id": number
                  }
                  Update: {
                    "form"?: string,"kind"?: string,"lexeme_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_forms_lexeme_id_fkey"
      columns: ["lexeme_id"]
isOneToOne: false
      referencedRelation: "lexemes"
      referencedColumns: ["id"]
    }
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
            "api_usage_daily": {
                  Row: {
                    "cache_read_tokens": number | null,"cost_usd_micros": number | null,"day": string | null,"feature": string,"input_tokens": number | null,"model": string,"output_tokens": number | null,"requests": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "get_leaderboard":
{ Args: { "p_limit"?: number,"p_period"?: string }; Returns: {
              "avatar_key": string,"display_name": string,"is_me": boolean,"rank": number,"xp": number
            }[]
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"svc_add_card":
{ Args: { "p_sense": number,"p_user": string,"p_via"?: string }; Returns: boolean
                           },
"svc_ai_spend_today":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"svc_award_xp":
{ Args: { "p_amount": number,"p_coins"?: number,"p_key": string,"p_metadata"?: Json,"p_reason": Database["public"]['Enums']["xp_reason"],"p_ref_id"?: string,"p_ref_type"?: string,"p_user": string }; Returns: Json
                           },
"svc_bump_quest":
{ Args: { "p_amount"?: number,"p_key": string,"p_user": string }; Returns: {
              "claimed_at": string | null,
"completed_at": string | null,
"goal": number,
"kind": string,
"period_key": string,
"progress": number,
"quest_key": string,
"reward_coins": number,
"reward_xp": number,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "user_quests"
        isOneToOne: false
        isSetofReturn: true
      } },
"svc_bump_report":
{ Args: { "p_question": string }; Returns: undefined
                           },
"svc_chat_turn":
{ Args: { "p_day": string,"p_user": string }; Returns: undefined
                           },
"svc_claim_quest":
{ Args: { "p_key": string,"p_period": string,"p_user": string }; Returns: Json
                           },
"svc_housekeeping":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"svc_merge_guest":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"svc_promote":
{ Args: { "p_to": Database["public"]['Enums']["career_rank"],"p_user": string }; Returns: Database["public"]['Enums']["career_rank"]
                           },
"svc_purge_chat_logs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"svc_rate_limit":
{ Args: { "p_bucket": string,"p_limit": number,"p_subject": string,"p_window_s": number }; Returns: boolean
                           },
"svc_record_attempt":
{ Args: { "p_delivery": string,"p_is_correct": boolean,"p_max_attempts"?: number,"p_response": Json,"p_user": string }; Returns: Json
                           },
"svc_save_position":
{ Args: { "p_position": Json,"p_user": string }; Returns: undefined
                           },
"svc_spend_coins":
{ Args: { "p_amount": number,"p_key": string,"p_reason": string,"p_user": string }; Returns: number
                           }
          }
          Enums: {
            "app_role": "editor"|"admin","career_rank": "intern"|"junior"|"mid"|"senior"|"techlead","cefr_level": "A1"|"A2"|"B1"|"B2"|"C1","content_origin": "dataset"|"ai"|"human","content_status": "draft"|"auto_checked"|"in_review"|"published"|"rejected"|"retired","question_type": "mcq_meaning"|"fill_blank"|"sentence_order"|"error_correction"|"reply_choice"|"listening","srs_state": "new"|"learning"|"review"|"relearning","xp_reason": "quiz_correct"|"daily_learn"|"daily_complete"|"review"|"dialogue_complete"|"minigame_complete"|"chat_session"|"quest_reward"|"achievement_reward"|"boss_pass"|"streak_bonus"|"admin_adjust"|"merge"
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
            "app_role": ["editor", "admin"],"career_rank": ["intern", "junior", "mid", "senior", "techlead"],"cefr_level": ["A1", "A2", "B1", "B2", "C1"],"content_origin": ["dataset", "ai", "human"],"content_status": ["draft", "auto_checked", "in_review", "published", "rejected", "retired"],"question_type": ["mcq_meaning", "fill_blank", "sentence_order", "error_correction", "reply_choice", "listening"],"srs_state": ["new", "learning", "review", "relearning"],"xp_reason": ["quiz_correct", "daily_learn", "daily_complete", "review", "dialogue_complete", "minigame_complete", "chat_session", "quest_reward", "achievement_reward", "boss_pass", "streak_bonus", "admin_adjust", "merge"]
          }
        }
} as const
