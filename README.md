# Unbind

A modern divorce collaboration platform that streamlines the divorce process through intelligent collaboration between attorneys and clients. Unbind brings clarity and organization to complex legal proceedings while empowering both legal professionals and their clients through document management, educational resources, and AI-powered features.

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Authentication, Real-time)
- **AI Integration:** GPT-4 (planned for document analysis)
- **Deployment:** Vercel (planned)
- **Version Control:** Git, GitHub

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- Git installed

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ewills88/unbind-platform.git
cd unbind-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get these values from your Supabase project dashboard at `https://supabase.com/dashboard`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Current Features (Session 1 - Completed)

### ✅ Authentication System
- Professional login and registration pages
- Email/password authentication via Supabase
- Form validation and error handling
- Session management
- Secure logout functionality

### ✅ Protected Dashboard
- Role-based content (Attorney vs Client views)
- User profile display with account information
- Dashboard overview cards (Cases, Messages, Tasks)
- Quick action buttons for common tasks
- Responsive navigation bar

### ✅ Database Architecture
- PostgreSQL database via Supabase
- User profiles table with role management
- Cases table (foundation for case management)
- Row Level Security (RLS) policies
- Automatic profile creation on user signup

## Project Structure
```
unbind-web/
├── app/
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   ├── dashboard/      # Protected dashboard
│   └── api/            # API routes
├── lib/
│   └── supabase/       # Supabase client configuration
├── components/         # Reusable React components
└── public/            # Static assets
```

## Next Steps (Upcoming Sessions)

### Session 2: Case Management
- Create case creation flow
- Case details page
- Case status tracking
- Attorney-client case linking

### Session 3: Document Management
- Document upload functionality
- AI-powered document categorization
- Document viewer
- File storage with Supabase Storage

### Session 4: Messaging & Collaboration
- Real-time messaging between attorneys and clients
- Task management system
- Calendar integration for important dates
- Notification system

### Future Features
- State-specific divorce workflows
- AI document analysis and insights
- Educational resources library
- Mobile app (iOS & Android via React Native)

## Development Notes

- Built with AI-accelerated development using Cursor AI
- Follows Next.js 14 App Router patterns
- Uses TypeScript for type safety
- Implements modern React patterns (hooks, functional components)
- Database security via Row Level Security policies

## Contributing

This is a private project currently in active development. Contact the repository owner for collaboration opportunities.

## License

Proprietary - All rights reserved

---

**Built with ❤️ by Eric Wills**