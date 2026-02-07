-- Count recognitions for a user in the current calendar month
CREATE OR REPLACE FUNCTION public.get_recognition_count_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.discoveries
  WHERE discovered_by_user_id = p_user_id
    AND discovered_at >= date_trunc('month', NOW());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Index for fast monthly counting
CREATE INDEX IF NOT EXISTS idx_discoveries_user_month
  ON public.discoveries(discovered_by_user_id, discovered_at DESC);
