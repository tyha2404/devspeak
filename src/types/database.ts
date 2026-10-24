
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
                },"certificates": {
                  Row: {
                    "id": string,"issued_at": string,"score_pct": number,"stage_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"issued_at"?: string,"score_pct": number,"stage_id": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"issued_at"?: string,"score_pct"?: number,"stage_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
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
                },"lesson_questions": {
                  Row: {
                    "lesson_id": number,"question_id": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "lesson_id": number,"question_id": string,"sort"?: number
                  }
                  Update: {
                    "lesson_id"?: number,"question_id"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_questions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_questions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_runs": {
                  Row: {
                    "dialogue_run_id": string | null,"finished_at": string | null,"id": string,"lesson_id": number,"quiz_session_id": string | null,"result": Json | null,"started_at": string,"task_feedback": Json | null,"task_score": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dialogue_run_id"?: string | null,"finished_at"?: string | null,"id"?: string,"lesson_id": number,"quiz_session_id"?: string | null,"result"?: Json | null,"started_at"?: string,"task_feedback"?: Json | null,"task_score"?: number | null,"user_id": string
                  }
                  Update: {
                    "dialogue_run_id"?: string | null,"finished_at"?: string | null,"id"?: string,"lesson_id"?: number,"quiz_session_id"?: string | null,"result"?: Json | null,"started_at"?: string,"task_feedback"?: Json | null,"task_score"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_runs_dialogue_run_id_fkey"
      columns: ["dialogue_run_id"]
isOneToOne: false
      referencedRelation: "dialogue_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_runs_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_runs_quiz_session_id_fkey"
      columns: ["quiz_session_id"]
isOneToOne: false
      referencedRelation: "quiz_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "body": NonNullable<Json>,"dialogue_id": string | null,"est_minutes": number,"id": number,"kind": Database["public"]['Enums']["lesson_kind"],"pass_pct": number,"private": NonNullable<Json>,"question_count": number,"slug": string,"sort": number,"title_en": string,"title_vi": string,"unit_id": number,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: NonNullable<Json>,"dialogue_id"?: string | null,"est_minutes": number,"id"?: number,"kind": Database["public"]['Enums']["lesson_kind"],"pass_pct"?: number,"private"?: NonNullable<Json>,"question_count"?: number,"slug": string,"sort": number,"title_en": string,"title_vi": string,"unit_id": number,"xp": number
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"dialogue_id"?: string | null,"est_minutes"?: number,"id"?: number,"kind"?: Database["public"]['Enums']["lesson_kind"],"pass_pct"?: number,"private"?: NonNullable<Json>,"question_count"?: number,"slug"?: string,"sort"?: number,"title_en"?: string,"title_vi"?: string,"unit_id"?: number,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_dialogue_id_fkey"
      columns: ["dialogue_id"]
isOneToOne: false
      referencedRelation: "dialogues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
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
                },"mistakes": {
                  Row: {
                    "explanation_vi": string,"id": number,"kind": string,"right": string,"say": string | null,"slug": string,"tags": (string)[],"wrong": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "explanation_vi": string,"id"?: number,"kind": string,"right": string,"say"?: string | null,"slug": string,"tags"?: (string)[],"wrong"?: string | null
                  }
                  Update: {
                    "explanation_vi"?: string,"id"?: number,"kind"?: string,"right"?: string,"say"?: string | null,"slug"?: string,"tags"?: (string)[],"wrong"?: string | null
                  }
                  Relationships: [
                    
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
                    "created_at": string,"current_unit_id": number | null,"daily_goal_xp": number,"display_name": string | null,"goal_reason": string | null,"id": string,"onboarded_at": string | null,"placement_level": Database["public"]['Enums']["cefr_level"] | null,"streak_current": number,"streak_freezes": number,"streak_last_date": string | null,"streak_longest": number,"target_level": Database["public"]['Enums']["cefr_level"],"timezone": string,"ui_locale": string,"updated_at": string,"xp_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_unit_id"?: number | null,"daily_goal_xp"?: number,"display_name"?: string | null,"goal_reason"?: string | null,"id": string,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Update: {
                    "created_at"?: string,"current_unit_id"?: number | null,"daily_goal_xp"?: number,"display_name"?: string | null,"goal_reason"?: string | null,"id"?: string,"onboarded_at"?: string | null,"placement_level"?: Database["public"]['Enums']["cefr_level"] | null,"streak_current"?: number,"streak_freezes"?: number,"streak_last_date"?: string | null,"streak_longest"?: number,"target_level"?: Database["public"]['Enums']["cefr_level"],"timezone"?: string,"ui_locale"?: string,"updated_at"?: string,"xp_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_unit_id_fkey"
      columns: ["current_unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
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
                    "answered_count": number,"correct_count": number,"finished_at": string | null,"id": string,"kind": string,"max_attempts": number,"npc_id": string | null,"planned_count": number,"question_ids": (string)[],"ref": string | null,"started_at": string,"time_limited": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_count"?: number,"correct_count"?: number,"finished_at"?: string | null,"id"?: string,"kind": string,"max_attempts"?: number,"npc_id"?: string | null,"planned_count": number,"question_ids": (string)[],"ref"?: string | null,"started_at"?: string,"time_limited"?: boolean,"user_id": string
                  }
                  Update: {
                    "answered_count"?: number,"correct_count"?: number,"finished_at"?: string | null,"id"?: string,"kind"?: string,"max_attempts"?: number,"npc_id"?: string | null,"planned_count"?: number,"question_ids"?: (string)[],"ref"?: string | null,"started_at"?: string,"time_limited"?: boolean,"user_id"?: string
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
                },"situations": {
                  Row: {
                    "category": string,"cefr": Database["public"]['Enums']["cefr_level"],"context_vi": string,"id": number,"mistakes": (string)[],"phrases": NonNullable<Json>,"roleplay": Json | null,"slug": string,"sort": number,"title_en": string,"title_vi": string,"unit_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"cefr": Database["public"]['Enums']["cefr_level"],"context_vi": string,"id"?: number,"mistakes"?: (string)[],"phrases": NonNullable<Json>,"roleplay"?: Json | null,"slug": string,"sort"?: number,"title_en": string,"title_vi": string,"unit_id"?: number | null
                  }
                  Update: {
                    "category"?: string,"cefr"?: Database["public"]['Enums']["cefr_level"],"context_vi"?: string,"id"?: number,"mistakes"?: (string)[],"phrases"?: NonNullable<Json>,"roleplay"?: Json | null,"slug"?: string,"sort"?: number,"title_en"?: string,"title_vi"?: string,"unit_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "situations_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
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
                },"stages": {
                  Row: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"checkpoint_pass_pct": number,"checkpoint_size": number,"description_vi": string,"id": number,"slug": string,"sort": number,"tagline_vi": string,"title_en": string,"title_vi": string,"track": Database["public"]['Enums']["study_track"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr": Database["public"]['Enums']["cefr_level"],"checkpoint_pass_pct"?: number,"checkpoint_size"?: number,"description_vi": string,"id"?: number,"slug": string,"sort": number,"tagline_vi": string,"title_en": string,"title_vi": string,"track"?: Database["public"]['Enums']["study_track"]
                  }
                  Update: {
                    "cefr"?: Database["public"]['Enums']["cefr_level"],"checkpoint_pass_pct"?: number,"checkpoint_size"?: number,"description_vi"?: string,"id"?: number,"slug"?: string,"sort"?: number,"tagline_vi"?: string,"title_en"?: string,"title_vi"?: string,"track"?: Database["public"]['Enums']["study_track"]
                  }
                  Relationships: [
                    
                  ]
                },"units": {
                  Row: {
                    "can_do": NonNullable<Json>,"cefr": Database["public"]['Enums']["cefr_level"],"character": string,"code": string,"id": number,"kind": Database["public"]['Enums']["unit_kind"],"roleplay": Json | null,"slug": string,"sort": number,"stage_id": number,"status": Database["public"]['Enums']["content_status"],"summary_vi": string,"title_en": string,"title_vi": string
                  }
                  ComputedFields: never
                  Insert: {
                    "can_do"?: NonNullable<Json>,"cefr": Database["public"]['Enums']["cefr_level"],"character": string,"code": string,"id"?: number,"kind": Database["public"]['Enums']["unit_kind"],"roleplay"?: Json | null,"slug": string,"sort": number,"stage_id": number,"status"?: Database["public"]['Enums']["content_status"],"summary_vi": string,"title_en": string,"title_vi": string
                  }
                  Update: {
                    "can_do"?: NonNullable<Json>,"cefr"?: Database["public"]['Enums']["cefr_level"],"character"?: string,"code"?: string,"id"?: number,"kind"?: Database["public"]['Enums']["unit_kind"],"roleplay"?: Json | null,"slug"?: string,"sort"?: number,"stage_id"?: number,"status"?: Database["public"]['Enums']["content_status"],"summary_vi"?: string,"title_en"?: string,"title_vi"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
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
                },"user_lesson_progress": {
                  Row: {
                    "attempts": number,"best_pct": number,"completed_at": string | null,"last_at": string,"last_correct": number | null,"last_pct": number | null,"last_total": number | null,"lesson_id": number,"stars": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"best_pct"?: number,"completed_at"?: string | null,"last_at"?: string,"last_correct"?: number | null,"last_pct"?: number | null,"last_total"?: number | null,"lesson_id": number,"stars"?: number,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"best_pct"?: number,"completed_at"?: string | null,"last_at"?: string,"last_correct"?: number | null,"last_pct"?: number | null,"last_total"?: number | null,"lesson_id"?: number,"stars"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
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
                },"user_unit_progress": {
                  Row: {
                    "completed_at": string,"unit_id": number,"user_id": string,"via": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"unit_id": number,"user_id": string,"via": string
                  }
                  Update: {
                    "completed_at"?: string,"unit_id"?: number,"user_id"?: string,"via"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_unit_progress_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
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
            "get_certificate":
{ Args: { "p_id": string }; Returns: {
              "cefr": Database["public"]['Enums']["cefr_level"],"display_name": string,"id": string,"issued_at": string,"score_pct": number,"stage_slug": string,"stage_sort": number,"stage_title_en": string,"stage_title_vi": string
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
{ Args: { "p_amount": number,"p_key": string,"p_metadata"?: Json,"p_reason": Database["public"]['Enums']["xp_reason"],"p_ref_id"?: string,"p_ref_type"?: string,"p_user": string }; Returns: Json
                           },
"svc_bump_report":
{ Args: { "p_question": string }; Returns: undefined
                           },
"svc_chat_turn":
{ Args: { "p_day": string,"p_user": string }; Returns: undefined
                           },
"svc_complete_lesson":
{ Args: { "p_run": string,"p_user": string }; Returns: Json
                           },
"svc_housekeeping":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"svc_merge_guest":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"svc_pass_checkpoint":
{ Args: { "p_session": string,"p_user": string }; Returns: Json
                           },
"svc_place_user":
{ Args: { "p_cefr": Database["public"]['Enums']["cefr_level"],"p_unit": number,"p_user": string }; Returns: undefined
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
"svc_test_out_unit":
{ Args: { "p_session": string,"p_user": string }; Returns: Json
                           }
          }
          Enums: {
            "app_role": "editor"|"admin","cefr_level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2","content_origin": "dataset"|"ai"|"human","content_status": "draft"|"auto_checked"|"in_review"|"published"|"rejected"|"retired","lesson_kind": "vocab"|"dialogue"|"focus"|"practice"|"reading"|"listening"|"mistakes"|"task"|"grammar","question_type": "mcq_meaning"|"fill_blank"|"sentence_order"|"error_correction"|"reply_choice"|"listening","srs_state": "new"|"learning"|"review"|"relearning","study_track": "career"|"grammar"|"vocab","unit_kind": "situation"|"knowledge"|"grammar"|"topic","xp_reason": "quiz_correct"|"daily_learn"|"daily_complete"|"review"|"dialogue_complete"|"minigame_complete"|"chat_session"|"quest_reward"|"achievement_reward"|"boss_pass"|"streak_bonus"|"admin_adjust"|"merge"|"lesson_complete"|"checkpoint_pass"
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
            "app_role": ["editor", "admin"],"cefr_level": ["A1", "A2", "B1", "B2", "C1", "C2"],"content_origin": ["dataset", "ai", "human"],"content_status": ["draft", "auto_checked", "in_review", "published", "rejected", "retired"],"lesson_kind": ["vocab", "dialogue", "focus", "practice", "reading", "listening", "mistakes", "task", "grammar"],"question_type": ["mcq_meaning", "fill_blank", "sentence_order", "error_correction", "reply_choice", "listening"],"srs_state": ["new", "learning", "review", "relearning"],"study_track": ["career", "grammar", "vocab"],"unit_kind": ["situation", "knowledge", "grammar", "topic"],"xp_reason": ["quiz_correct", "daily_learn", "daily_complete", "review", "dialogue_complete", "minigame_complete", "chat_session", "quest_reward", "achievement_reward", "boss_pass", "streak_bonus", "admin_adjust", "merge", "lesson_complete", "checkpoint_pass"]
          }
        }
} as const
