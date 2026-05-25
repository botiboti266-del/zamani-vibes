CREATE POLICY "Admins can view all listening history"
ON public.listening_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));