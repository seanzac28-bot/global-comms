# Overview

This is a real-time language exchange chat application that connects users from different countries to help them practice languages together. The platform matches users randomly for one-on-one conversations with built-in translation features and a personal dictionary for saving new words and phrases they learn.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket client for live chat functionality

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Features**: WebSocket server using the 'ws' library for live chat and user matching
- **API Design**: RESTful endpoints for user management, translation, and dictionary features

## Authentication & Authorization
- **Provider**: Replit Auth integration using OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Security**: HTTP-only cookies with secure flags for session persistence

## Data Storage
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL driver for cloud database connectivity
- **Schema Design**: 
  - Users table for authentication and language preferences
  - Chat rooms for user matching and conversation management
  - Messages for chat history
  - Dictionary entries for personal vocabulary storage
  - Sessions table for authentication state

## Real-time Chat System
- **User Matching**: Queue-based system that pairs waiting users randomly
- **Message Flow**: WebSocket connections handle message sending, receiving, typing indicators, and translation requests
- **Translation Integration**: Server-side translation using MyMemory Translation API
- **Chat Lifecycle**: Automatic room creation, user pairing, and conversation cleanup

## External Dependencies

- **Translation Service**: MyMemory Translation API for real-time text translation between 60+ supported languages
- **Database Hosting**: Neon PostgreSQL for serverless database hosting
- **Authentication**: Replit's OIDC service for user authentication and profile management
- **UI Components**: Radix UI primitives through shadcn/ui for accessible component foundations
- **Development Tools**: Replit-specific plugins for development environment integration including error overlays and dev banners