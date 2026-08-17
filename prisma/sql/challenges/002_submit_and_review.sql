-- docs/DB.md §6.4
-- 単一承認確定（2026-08-17）: 1件目のレビューで即 awarded/rejected。
-- decision='rejected'時の遷移も明記（PRレビュー指摘で追加）。

CREATE OR REPLACE FUNCTION submit_challenge(
  p_group_id uuid,
  p_challenge_id uuid,
  p_evidence_path text DEFAULT NULL
) RETURNS challenge_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge challenges;
  v_last_attempt challenge_attempts;
  v_result challenge_attempts;
BEGIN
  IF NOT is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'submit_challenge: not a member of this group';
  END IF;

  SELECT * INTO v_challenge FROM challenges
  WHERE id = p_challenge_id AND status = 'active' AND (group_id IS NULL OR group_id = p_group_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submit_challenge: challenge not found or not available for this group';
  END IF;

  IF v_challenge.requires_evidence_photo AND p_evidence_path IS NULL THEN
    RAISE EXCEPTION 'submit_challenge: evidence photo is required for this challenge';
  END IF;

  IF v_challenge.cooldown_seconds IS NOT NULL THEN
    SELECT * INTO v_last_attempt
    FROM challenge_attempts
    WHERE group_id = p_group_id AND challenge_id = p_challenge_id AND user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND AND v_last_attempt.created_at > now() - make_interval(secs => v_challenge.cooldown_seconds) THEN
      RAISE EXCEPTION 'submit_challenge: still in cooldown';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM challenge_attempts
    WHERE group_id = p_group_id AND challenge_id = p_challenge_id
      AND user_id = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'submit_challenge: a pending attempt already exists for this challenge';
  END IF;

  INSERT INTO challenge_attempts (id, group_id, challenge_id, user_id, status, evidence_path, created_at, updated_at)
  VALUES (gen_random_uuid(), p_group_id, p_challenge_id, auth.uid(), 'pending', p_evidence_path, now(), now())
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION approve_challenge(p_attempt_id uuid, p_decision approval_decision)
RETURNS challenge_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt challenge_attempts;
  v_challenge challenges;
  v_ledger_id uuid;
  v_result challenge_attempts;
BEGIN
  SELECT * INTO v_attempt FROM challenge_attempts
  WHERE id = p_attempt_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_challenge: attempt not found or already reviewed';
  END IF;

  IF NOT is_group_member(v_attempt.group_id) THEN
    RAISE EXCEPTION 'approve_challenge: not authorized';
  END IF;

  IF v_attempt.user_id = auth.uid() THEN
    RAISE EXCEPTION 'approve_challenge: cannot review your own attempt';
  END IF;

  IF p_decision = 'approved' THEN
    SELECT * INTO v_challenge FROM challenges WHERE id = v_attempt.challenge_id;

    SELECT (_credit_wallet(
      v_attempt.group_id, v_attempt.user_id, v_challenge.reward_points,
      'challenge_reward', 'challenge_attempts', v_attempt.id
    )).id INTO v_ledger_id;

    UPDATE challenge_attempts
    SET status = 'awarded',
        reviewed_by = auth.uid(),
        reviewed_decision = p_decision,
        reviewed_at = now(),
        reward_points = v_challenge.reward_points,
        awarded_ledger_id = v_ledger_id,
        awarded_at = now(),
        updated_at = now()
    WHERE id = p_attempt_id
    RETURNING * INTO v_result;
  ELSE
    UPDATE challenge_attempts
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_decision = p_decision,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_attempt_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION create_group_challenge(
  p_group_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_reward_points int DEFAULT 0,
  p_requires_evidence_photo boolean DEFAULT false,
  p_cooldown_seconds int DEFAULT NULL
) RETURNS challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result challenges;
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'create_group_challenge: not authorized';
  END IF;

  IF p_reward_points < 0 THEN
    RAISE EXCEPTION 'create_group_challenge: reward_points must be >= 0';
  END IF;

  INSERT INTO challenges (
    id, group_id, created_by, title, description, reward_points,
    requires_evidence_photo, cooldown_seconds, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_group_id, auth.uid(), p_title, p_description, p_reward_points,
    p_requires_evidence_photo, p_cooldown_seconds, 'active', now(), now()
  ) RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_challenge(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_challenge(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION approve_challenge(uuid, approval_decision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_challenge(uuid, approval_decision) TO authenticated;

REVOKE EXECUTE ON FUNCTION create_group_challenge(uuid, text, text, int, boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_group_challenge(uuid, text, text, int, boolean, int) TO authenticated;
