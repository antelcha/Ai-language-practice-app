-- Simple Supabase Tables without JWT/RLS complexity

-- Create users table (simple version)
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  learning_goal TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create writing_history table
CREATE TABLE IF NOT EXISTS public.writing_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  topic TEXT,
  original_text TEXT NOT NULL,
  corrected_text TEXT,
  errors TEXT DEFAULT '[]',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create speaking_history table
CREATE TABLE IF NOT EXISTS public.speaking_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  topic TEXT,
  transcript TEXT NOT NULL,
  audio_url TEXT,
  errors TEXT DEFAULT '[]',
  scores TEXT DEFAULT '{}',
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  total_writing_sessions INTEGER DEFAULT 0,
  total_speaking_sessions INTEGER DEFAULT 0,
  total_errors_fixed INTEGER DEFAULT 0,
  average_writing_score DECIMAL(5,2) DEFAULT 0,
  average_speaking_score DECIMAL(5,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  daily_goal INTEGER DEFAULT 1,
  preferred_topics TEXT DEFAULT '[]',
  difficulty_level TEXT DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_writing_history_user_id ON public.writing_history(user_id);
CREATE INDEX idx_writing_history_created_at ON public.writing_history(created_at DESC);
CREATE INDEX idx_speaking_history_user_id ON public.speaking_history(user_id);
CREATE INDEX idx_speaking_history_created_at ON public.speaking_history(created_at DESC);
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Insert sample data for testing
INSERT INTO public.users (email, first_name, last_name, learning_goal) VALUES 
('test@example.com', 'Test', 'User', 'Improve English speaking skills');

INSERT INTO public.analytics (user_id, total_writing_sessions, total_speaking_sessions) VALUES 
(1, 0, 0);

INSERT INTO public.user_settings (user_id) VALUES (1); 