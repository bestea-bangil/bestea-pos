-- Fix RLS Policies for shift_sessions
-- Allow public (anon) access for development since auth is handled via custom JWT
DROP POLICY IF EXISTS "Allow public read" ON shift_sessions;
DROP POLICY IF EXISTS "Allow public insert" ON shift_sessions;
DROP POLICY IF EXISTS "Allow public update" ON shift_sessions;

CREATE POLICY "Allow public read" ON shift_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON shift_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON shift_sessions FOR UPDATE USING (true);
