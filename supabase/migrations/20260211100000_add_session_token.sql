-- Add last_login_token to users table to support single session enforcement
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_token TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.users.last_login_token IS 'Stores the unique token of the current valid session. Used to invalidate older sessions.';

-- Enable Realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
