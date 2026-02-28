-- Migration 004: Fix business_type constraint to allow free-form strings
-- This is necessary due to the shift from restricted beauty/wellness to generic domain scraping.

-- 1. Identify and drop the check constraint on business_type
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'business_context'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%business_type%ANY%'
        OR pg_get_constraintdef(oid) LIKE '%business_type%in%'
    LOOP
        EXECUTE 'ALTER TABLE business_context DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Optional: If the column was an enum (it was 'text' with a check, so we are good), 
-- but we've already confirmed it's 'text' in supabase/002_business_context.sql.

-- 3. Update any existing data if needed (not needed since it's just removing a restriction)
