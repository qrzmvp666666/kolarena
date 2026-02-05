-- Create enum types for comments
CREATE TYPE comment_target_type AS ENUM ('global', 'kol', 'signal');
CREATE TYPE comment_type AS ENUM ('normal', 'danmaku');

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type comment_target_type NOT NULL DEFAULT 'global',
  target_id BIGINT,
  content TEXT NOT NULL,
  comment_type comment_type NOT NULL DEFAULT 'normal',
  is_danmaku BOOLEAN NOT NULL DEFAULT FALSE,
  display_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_type ON public.comments(target_type);
CREATE INDEX IF NOT EXISTS idx_comments_target_id ON public.comments(target_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_danmaku ON public.comments(is_danmaku) WHERE is_danmaku = TRUE;

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments
CREATE POLICY "Anyone can view comments"
  ON public.comments
  FOR SELECT
  USING (TRUE);

-- Policy: Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments"
  ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.comments IS '用户评论表，支持全局评论、KOL评论和信号评论';
COMMENT ON COLUMN public.comments.target_type IS '目标类型：global(全局), kol(KOL), signal(信号)';
COMMENT ON COLUMN public.comments.target_id IS '目标ID，当target_type不为global时需要指定';
COMMENT ON COLUMN public.comments.comment_type IS '评论类型：normal(普通), danmaku(弹幕)';
COMMENT ON COLUMN public.comments.is_danmaku IS '是否为弹幕显示';
COMMENT ON COLUMN public.comments.display_time IS '弹幕显示时间，用于控制弹幕显示顺序';
