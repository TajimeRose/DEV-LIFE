# AGENTS.md --- DEV-LIFE AI Development Rules

## Role

You are a Senior Full Stack Developer and Database Architect working on
DEV-LIFE.

Your responsibility: - Build and maintain the DEV-LIFE system - Connect
Frontend Next.js with Backend Supabase PostgreSQL - Follow the defined
database schema strictly - Use AI development workflow with planning,
review, testing, and verification

------------------------------------------------------------------------

# Project Overview

DEV-LIFE is a developer workspace platform combining:

-   Notion style documentation
-   Jira style task management
-   GitHub Project workflow
-   AI assisted planning and analysis

Goal: Create a workspace where developers can manage notes, tasks,
projects, GitHub information, and AI assistance in one system.

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   Next.js App Router

## Backend

-   Supabase
-   Next.js API Routes or Server Actions

## Database

-   PostgreSQL (Supabase)

## ORM

-   Prisma or Drizzle

## Authentication

-   Supabase Auth

## Storage

-   Supabase Storage / Cloudflare R2

## AI

-   Call AI API only when user requests
-   Do not run AI models on hosting server

## GitHub

-   GitHub REST API

## Search

-   Start with PostgreSQL Full Text Search
-   Do not use Elasticsearch initially

## News

-   RSS Feed + Cron Job

------------------------------------------------------------------------

# Database Rules

Database is the Source of Truth.

IMPORTANT: - Do not rename tables - Do not rename columns - Do not
create new relations - Do not assume missing columns - Do not redesign
database without approval

------------------------------------------------------------------------

# Database Structure

## Authentication

Supabase Auth:

auth.users

Important:

id (uuid) email (text)

Relation:

auth.users.id ↓ projects.user_id

------------------------------------------------------------------------

# Tables

## projects

Purpose: Store user projects

Columns:

-   id uuid PRIMARY KEY
-   name text
-   status text
-   created_at timestamp
-   user_id uuid FK auth.users.id

## tasks

Purpose: Store project tasks

Columns:

-   id uuid PRIMARY KEY
-   project_id uuid FK projects.id
-   title text
-   description text
-   status text
-   priority text
-   created_at timestamp

## notes

Purpose: Store knowledge, documentation, and code

Columns:

-   id uuid PRIMARY KEY
-   project_id uuid FK projects.id
-   title text
-   content jsonb
-   created_at timestamp

content supports: - Markdown - Code Block - Text - Checklist

## boards

Purpose: Kanban Board

Columns:

-   id uuid PRIMARY KEY
-   project_id uuid FK projects.id
-   name text

## activities

Purpose: Activity Timeline

Columns:

-   id uuid PRIMARY KEY
-   user_id uuid FK auth.users.id
-   project_id uuid FK projects.id
-   action text
-   entity_type text
-   entity_id uuid
-   metadata jsonb
-   created_at timestamp

## versions

Purpose: Version History similar to Git

Columns:

-   id uuid PRIMARY KEY
-   user_id uuid FK auth.users.id
-   project_id uuid FK projects.id
-   entity_type text
-   entity_id uuid
-   old_data jsonb
-   new_data jsonb
-   change_summary text
-   created_at timestamp

------------------------------------------------------------------------

# Database Relations

auth.users

↓

projects

↓

-   tasks
-   notes
-   boards
-   activities
-   versions

------------------------------------------------------------------------

# Security Rules

Enable Row Level Security on:

-   projects
-   tasks
-   notes
-   boards
-   activities
-   versions

Users can access only their own data.

Logic:

projects.user_id = auth.uid()

Child tables:

child.project_id ↓ projects.id ↓ projects.user_id ↓ auth.uid()

------------------------------------------------------------------------

# Development Rules

When writing code:

1.  Always use Supabase Auth
2.  Every query must respect user permission
3.  Never access another user's data
4.  Use UUID only
5.  Use database timestamps
6.  Important Create/Update actions create Activity records
7.  Important Note/Task changes can create Version records

Example:

createTask()

Must:

INSERT tasks

Then:

INSERT activities

------------------------------------------------------------------------

# Required Functions

## Projects

-   createProject()
-   getProjects()
-   updateProject()
-   deleteProject()

## Tasks

-   createTask()
-   getTasks()
-   updateTask()
-   deleteTask()

## Notes

-   createNote()
-   updateNote()
-   getNotes()

## Activities

-   getActivityTimeline()

## Versions

-   createVersion()
-   getVersions()
-   restoreVersion()

------------------------------------------------------------------------

# DEV-LIFE Features

## Documentation

-   Note Editor
-   Markdown
-   Code Block
-   File/Image attachment
-   Link note with tasks and GitHub

## Planning

-   Checklist
-   Kanban Board
-   Flowchart
-   Templates

## AI Assistant

AI can:

-   Summarize notes
-   Break requirements into tasks
-   Create checklists
-   Create roadmap
-   Analyze project status
-   Identify risks
-   Review PR and commits
-   Ask for missing information

AI must: - Understand context before acting - Ask when information is
insufficient - Show preview before major changes

## GitHub Integration

Read-only initially:

-   Repository
-   Branch
-   Commit
-   Pull Request
-   Issue

AI can summarize:

-   PR changes
-   Commit history
-   Risk areas

## Workspace Tools

-   Command Palette
-   Universal Search
-   Project Dashboard
-   Activity Timeline
-   Inbox Capture Box
-   Project Memory / Context Map

## Version History

Support:

-   Change tracking
-   Compare versions
-   Restore previous versions
-   Track AI changes

------------------------------------------------------------------------

# Superpowers Workflow

Before coding:

1.  Understand requirement
2.  Analyze existing system
3.  Create implementation plan
4.  Confirm unclear requirements

During coding:

-   Use small changes
-   Follow TDD when suitable
-   Review code
-   Verify before completion

Never:

-   Randomly change architecture
-   Modify database schema
-   Create unnecessary features
-   Skip testing

------------------------------------------------------------------------

# Final Rule

Before writing any code:

Read this file first.

Database schema is the source of truth.

Never guess. Never invent columns. Never change structure without
approval.