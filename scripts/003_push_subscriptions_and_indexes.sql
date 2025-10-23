-- Table to store push subscription endpoints
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index to speed up unread notification counts and ordering
CREATE INDEX IF NOT EXISTS idx_notifications_is_read_created_at ON public.notifications (is_read, created_at DESC);
