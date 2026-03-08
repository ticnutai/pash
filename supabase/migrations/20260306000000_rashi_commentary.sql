-- Rashi commentary table for all 5 books of the Torah
CREATE TABLE IF NOT EXISTS public.rashi_commentary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sefer_id integer NOT NULL,       -- 1=Bereishit, 2=Shemot, 3=Vayikra, 4=Bamidbar, 5=Devarim
  perek integer NOT NULL,
  pasuk integer NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups by verse
CREATE INDEX IF NOT EXISTS idx_rashi_sefer_perek_pasuk
  ON public.rashi_commentary (sefer_id, perek, pasuk);

-- RLS: allow public read and insert (Rashi is public-domain historical text)
ALTER TABLE public.rashi_commentary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of rashi"
  ON public.rashi_commentary
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert of rashi"
  ON public.rashi_commentary
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete of rashi"
  ON public.rashi_commentary
  FOR DELETE
  USING (true);
