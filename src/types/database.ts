export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "admin" | "manager" | "worker";

export type TaskStatus = "pending" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: NewProfile;
        Update: Partial<NewProfile>;
      };
      projects: {
        Row: Project;
        Insert: NewProject;
        Update: Partial<NewProject>;
      };
      tasks: {
        Row: Task;
        Insert: NewTask;
        Update: Partial<NewTask>;
      };
      task_assignments: {
        Row: TaskAssignment;
        Insert: NewTaskAssignment;
        Update: Partial<NewTaskAssignment>;
      };
      attendance_logs: {
        Row: AttendanceLog;
        Insert: NewAttendanceLog;
        Update: Partial<NewAttendanceLog>;
      };
      progress_reports: {
        Row: ProgressReport;
        Insert: NewProgressReport;
        Update: Partial<NewProgressReport>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewProject {
  name: string;
  description?: string | null;
  location?: string | null;
  status?: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  start_date: string;
  end_date?: string | null;
  created_by: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewTask {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: string | null;
  created_by: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  worker_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface NewTaskAssignment {
  task_id: string;
  worker_id: string;
  assigned_by: string;
}

export interface AttendanceLog {
  id: string;
  worker_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewAttendanceLog {
  worker_id: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
}

export interface ProgressReport {
  id: string;
  project_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewProgressReport {
  project_id: string;
  title: string;
  content: string;
  created_by: string;
}
