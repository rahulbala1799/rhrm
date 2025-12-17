-- Allow public access to invitations by token
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'invitations' 
        AND policyname = 'invitations_select_policy_public'
    ) THEN
        CREATE POLICY invitations_select_policy_public ON invitations
            FOR SELECT
            USING (true);
    END IF;
END $$;

COMMENT ON POLICY invitations_select_policy_public ON invitations IS 
'Allow public access to read invitations (needed for invitation acceptance flow). Token acts as security credential.';
