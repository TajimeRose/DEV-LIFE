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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          id: string
          name: string | null
          project_id: string
        }
        Insert: {
          id?: string
          name?: string | null
          project_id?: string
        }
        Update: {
          id?: string
          name?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      flowcharts: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          project_id: string | null
          updated_at: string
          user_id: string
          viewport: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          project_id?: string | null
          updated_at?: string
          user_id: string
          viewport?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          project_id?: string | null
          updated_at?: string
          user_id?: string
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flowcharts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      github_webhook_deliveries: {
        Row: {
          created_at: string
          delivery_id: string
          error_message: string | null
          github_event: string
          id: string
          processed_at: string | null
          received_at: string
          repository_github_id: number | null
          repository_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          error_message?: string | null
          github_event: string
          id?: string
          processed_at?: string | null
          received_at?: string
          repository_github_id?: number | null
          repository_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          error_message?: string | null
          github_event?: string
          id?: string
          processed_at?: string | null
          received_at?: string
          repository_github_id?: number | null
          repository_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_webhook_deliveries_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          project_id: string
          title: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          project_id?: string
          title?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          project_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_logs: {
        Row: {
          action_type: string
          actor_github_login: string | null
          actor_user_id: string | null
          commit_sha: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          new_value: Json | null
          occurred_at: string
          old_value: Json | null
          project_id: string
          pull_request_number: number | null
          repository_id: string | null
          task_id: string | null
          title: string
        }
        Insert: {
          action_type: string
          actor_github_login?: string | null
          actor_user_id?: string | null
          commit_sha?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          project_id: string
          pull_request_number?: number | null
          repository_id?: string | null
          task_id?: string | null
          title: string
        }
        Update: {
          action_type?: string
          actor_github_login?: string | null
          actor_user_id?: string | null
          commit_sha?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          project_id?: string
          pull_request_number?: number | null
          repository_id?: string | null
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_logs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_repositories: {
        Row: {
          connected_by: string
          created_at: string
          default_branch: string | null
          github_full_name: string
          github_name: string
          github_owner: string
          github_repository_id: number
          github_url: string
          id: string
          is_archived: boolean
          is_private: boolean
          last_synced_at: string | null
          project_id: string
          sync_error: string | null
          sync_status: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          connected_by: string
          created_at?: string
          default_branch?: string | null
          github_full_name: string
          github_name: string
          github_owner: string
          github_repository_id: number
          github_url: string
          id?: string
          is_archived?: boolean
          is_private?: boolean
          last_synced_at?: string | null
          project_id: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          connected_by?: string
          created_at?: string
          default_branch?: string | null
          github_full_name?: string
          github_name?: string
          github_owner?: string
          github_repository_id?: number
          github_url?: string
          id?: string
          is_archived?: boolean
          is_private?: boolean
          last_synced_at?: string | null
          project_id?: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_repositories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      repository_branches: {
        Row: {
          branch_name: string
          created_at: string
          github_url: string | null
          id: string
          is_default: boolean
          is_protected: boolean
          latest_commit_sha: string | null
          repository_id: string
          updated_at: string
        }
        Insert: {
          branch_name: string
          created_at?: string
          github_url?: string | null
          id?: string
          is_default?: boolean
          is_protected?: boolean
          latest_commit_sha?: string | null
          repository_id: string
          updated_at?: string
        }
        Update: {
          branch_name?: string
          created_at?: string
          github_url?: string | null
          id?: string
          is_default?: boolean
          is_protected?: boolean
          latest_commit_sha?: string | null
          repository_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_branches_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_commits: {
        Row: {
          additions: number
          author_avatar_url: string | null
          author_email: string | null
          author_github_login: string | null
          author_name: string | null
          committed_at: string | null
          committer_name: string | null
          created_at: string
          deletions: number
          files_changed: number
          github_url: string | null
          id: string
          message: string
          message_body: string | null
          parent_shas: string[]
          repository_id: string
          sha: string
          short_sha: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          additions?: number
          author_avatar_url?: string | null
          author_email?: string | null
          author_github_login?: string | null
          author_name?: string | null
          committed_at?: string | null
          committer_name?: string | null
          created_at?: string
          deletions?: number
          files_changed?: number
          github_url?: string | null
          id?: string
          message: string
          message_body?: string | null
          parent_shas?: string[]
          repository_id: string
          sha: string
          short_sha?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          additions?: number
          author_avatar_url?: string | null
          author_email?: string | null
          author_github_login?: string | null
          author_name?: string | null
          committed_at?: string | null
          committer_name?: string | null
          created_at?: string
          deletions?: number
          files_changed?: number
          github_url?: string | null
          id?: string
          message?: string
          message_body?: string | null
          parent_shas?: string[]
          repository_id?: string
          sha?: string
          short_sha?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_commits_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_pull_request_reviews: {
        Row: {
          commit_sha: string | null
          created_at: string
          github_review_id: number | null
          id: string
          pull_request_id: string
          review_body: string | null
          review_state: string
          reviewer_avatar_url: string | null
          reviewer_github_login: string | null
          reviewer_user_id: string | null
          submitted_at: string | null
        }
        Insert: {
          commit_sha?: string | null
          created_at?: string
          github_review_id?: number | null
          id?: string
          pull_request_id: string
          review_body?: string | null
          review_state: string
          reviewer_avatar_url?: string | null
          reviewer_github_login?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          commit_sha?: string | null
          created_at?: string
          github_review_id?: number | null
          id?: string
          pull_request_id?: string
          review_body?: string | null
          review_state?: string
          reviewer_avatar_url?: string | null
          reviewer_github_login?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_pull_request_reviews_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "repository_pull_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_pull_requests: {
        Row: {
          additions: number
          author_avatar_url: string | null
          author_github_login: string | null
          changed_files_count: number
          closed_at: string | null
          comments_count: number
          commits_count: number
          created_at: string
          deletions: number
          description: string | null
          github_created_at: string | null
          github_pull_request_id: number
          github_updated_at: string | null
          github_url: string | null
          has_conflicts: boolean
          head_sha: string | null
          id: string
          is_draft: boolean
          is_mergeable: boolean | null
          merge_method: string | null
          merged_at: string | null
          merged_by_github_login: string | null
          pull_request_number: number
          repository_id: string
          review_status: string | null
          reviews_count: number
          source_branch: string
          state: string
          target_branch: string
          title: string
          updated_at: string
        }
        Insert: {
          additions?: number
          author_avatar_url?: string | null
          author_github_login?: string | null
          changed_files_count?: number
          closed_at?: string | null
          comments_count?: number
          commits_count?: number
          created_at?: string
          deletions?: number
          description?: string | null
          github_created_at?: string | null
          github_pull_request_id: number
          github_updated_at?: string | null
          github_url?: string | null
          has_conflicts?: boolean
          head_sha?: string | null
          id?: string
          is_draft?: boolean
          is_mergeable?: boolean | null
          merge_method?: string | null
          merged_at?: string | null
          merged_by_github_login?: string | null
          pull_request_number: number
          repository_id: string
          review_status?: string | null
          reviews_count?: number
          source_branch: string
          state: string
          target_branch: string
          title: string
          updated_at?: string
        }
        Update: {
          additions?: number
          author_avatar_url?: string | null
          author_github_login?: string | null
          changed_files_count?: number
          closed_at?: string | null
          comments_count?: number
          commits_count?: number
          created_at?: string
          deletions?: number
          description?: string | null
          github_created_at?: string | null
          github_pull_request_id?: number
          github_updated_at?: string | null
          github_url?: string | null
          has_conflicts?: boolean
          head_sha?: string | null
          id?: string
          is_draft?: boolean
          is_mergeable?: boolean | null
          merge_method?: string | null
          merged_at?: string | null
          merged_by_github_login?: string | null
          pull_request_number?: number
          repository_id?: string
          review_status?: string | null
          reviews_count?: number
          source_branch?: string
          state?: string
          target_branch?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_sync_logs: {
        Row: {
          branches_processed: number
          commits_processed: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          pull_requests_processed: number
          repository_id: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          branches_processed?: number
          commits_processed?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          pull_requests_processed?: number
          repository_id: string
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          branches_processed?: number
          commits_processed?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          pull_requests_processed?: number
          repository_id?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_sync_logs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          board_id: string | null
          branch_name: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          github_issue_number: number | null
          id: string
          linked_commit_sha: string | null
          linked_pull_request_number: number | null
          position: number
          priority: string
          project_id: string
          reporter_id: string | null
          repository_id: string | null
          start_date: string | null
          status: string
          task_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          board_id?: string | null
          branch_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          github_issue_number?: number | null
          id?: string
          linked_commit_sha?: string | null
          linked_pull_request_number?: number | null
          position?: number
          priority?: string
          project_id: string
          reporter_id?: string | null
          repository_id?: string | null
          start_date?: string | null
          status?: string
          task_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          board_id?: string | null
          branch_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          github_issue_number?: number | null
          id?: string
          linked_commit_sha?: string | null
          linked_pull_request_number?: number | null
          position?: number
          priority?: string
          project_id?: string
          reporter_id?: string | null
          repository_id?: string | null
          start_date?: string | null
          status?: string
          task_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
