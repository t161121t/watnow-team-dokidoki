-- docs/DB.md §4.14, §4.15, §7.2

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenges_select_system_or_group ON challenges;
CREATE POLICY challenges_select_system_or_group ON challenges
  FOR SELECT
  TO authenticated
  USING (group_id IS NULL OR is_group_member(group_id));

-- insertはcreate_group_challenge RPCのみ

ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenge_attempts_select_member ON challenge_attempts;
CREATE POLICY challenge_attempts_select_member ON challenge_attempts
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

-- insert/update（reviewed_*含む）はsubmit_challenge/approve_challenge RPCのみ
