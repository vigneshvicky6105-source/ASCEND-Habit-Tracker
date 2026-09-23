-- ============================================================================
-- ASCEND SAFE TASK DEDUPLICATION MIGRATION
-- ============================================================================
-- This script safely deduplicates tasks per user by matching starter_key or title,
-- selecting the canonical surviving task record, rebinding task_completions history,
-- and removing duplicate task records.
-- ============================================================================

DO $$
DECLARE
    dup_rec RECORD;
    survivor_id UUID;
BEGIN
    RAISE NOTICE 'Starting ASCEND Safe Task Deduplication...';

    -- Find groups of duplicate tasks per user based on starter_key or title
    FOR dup_rec IN
        SELECT user_id, COALESCE(starter_key, LOWER(TRIM(title))) as group_key
        FROM tasks
        WHERE active = true OR deleted_at IS NULL
        GROUP BY user_id, COALESCE(starter_key, LOWER(TRIM(title)))
        HAVING COUNT(*) > 1
    LOOP
        -- Pick the canonical surviving record for this duplicate group:
        -- 1. Prefer record with starter_key NOT NULL
        -- 2. Prefer record with deterministic starter UUID prefix ('00000000-0000-4000-8000-%')
        -- 3. Otherwise prefer oldest created_at timestamp
        SELECT id INTO survivor_id
        FROM tasks
        WHERE user_id = dup_rec.user_id
          AND (COALESCE(starter_key, LOWER(TRIM(title))) = dup_rec.group_key)
        ORDER BY
          (CASE WHEN starter_key IS NOT NULL THEN 0 ELSE 1 END),
          (CASE WHEN id::text LIKE '00000000-0000-4000-8000-%' THEN 0 ELSE 1 END),
          created_at ASC
        LIMIT 1;

        RAISE NOTICE 'Merging duplicates for user % (group %): Survivor ID = %', dup_rec.user_id, dup_rec.group_key, survivor_id;

        -- Step A: Rebind task_completions from duplicate task IDs to survivor_id
        UPDATE task_completions
        SET task_id = survivor_id
        WHERE task_id IN (
            SELECT id FROM tasks
            WHERE user_id = dup_rec.user_id
              AND (COALESCE(starter_key, LOWER(TRIM(title))) = dup_rec.group_key)
              AND id <> survivor_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM task_completions tc_existing
            WHERE tc_existing.user_id = task_completions.user_id
              AND tc_existing.task_id = survivor_id
              AND tc_existing.completed_on = task_completions.completed_on
        );

        -- Step B: Delete any remaining duplicate completion records that could not be rebound due to constraint
        DELETE FROM task_completions
        WHERE task_id IN (
            SELECT id FROM tasks
            WHERE user_id = dup_rec.user_id
              AND (COALESCE(starter_key, LOWER(TRIM(title))) = dup_rec.group_key)
              AND id <> survivor_id
        );

        -- Step C: Delete duplicate task records
        DELETE FROM tasks
        WHERE user_id = dup_rec.user_id
          AND (COALESCE(starter_key, LOWER(TRIM(title))) = dup_rec.group_key)
          AND id <> survivor_id;

    END LOOP;

    RAISE NOTICE 'ASCEND Task Deduplication Complete!';
END $$;
