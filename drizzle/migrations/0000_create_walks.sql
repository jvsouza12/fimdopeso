CREATE TABLE public.walks (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 started_at timestamptz NOT NULL,
 ended_at timestamptz NOT NULL,
 duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
 distance_meters double precision NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
 points jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.walks TO authenticated;
GRANT ALL ON public.walks TO service_role;
ALTER TABLE public.walks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own walks" ON public.walks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Save own walks" ON public.walks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own walks" ON public.walks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX walks_user_started_idx ON public.walks (user_id, started_at DESC);