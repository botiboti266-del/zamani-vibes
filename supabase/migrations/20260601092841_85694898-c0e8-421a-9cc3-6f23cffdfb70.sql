INSERT INTO storage.buckets (id, name, public) VALUES ('fx-sounds', 'fx-sounds', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own fx" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'fx-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own fx" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fx-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own fx" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fx-sounds' AND auth.uid()::text = (storage.foldername(name))[1]);