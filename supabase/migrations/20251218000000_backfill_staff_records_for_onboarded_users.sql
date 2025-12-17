-- Backfill Staff Records for Previously Onboarded Users
-- This migration creates staff records for all users who completed onboarding
-- but don't have a staff record yet (fixes issue where they don't appear in staff list)

-- Function to parse full_name into first_name and last_name
CREATE OR REPLACE FUNCTION parse_full_name(full_name TEXT)
RETURNS TABLE(first_name TEXT, last_name TEXT) AS $$
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN QUERY SELECT 'Staff'::TEXT, 'Member'::TEXT;
  END IF;

  -- Split by whitespace
  DECLARE
    name_parts TEXT[];
    first_part TEXT;
    rest_parts TEXT;
  BEGIN
    name_parts := string_to_array(trim(full_name), ' ');
    
    IF array_length(name_parts, 1) = 0 THEN
      RETURN QUERY SELECT 'Staff'::TEXT, 'Member'::TEXT;
    ELSIF array_length(name_parts, 1) = 1 THEN
      RETURN QUERY SELECT name_parts[1], 'Member'::TEXT;
    ELSE
      first_part := name_parts[1];
      rest_parts := array_to_string(name_parts[2:], ' ');
      RETURN QUERY SELECT first_part, rest_parts;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique employee number
CREATE OR REPLACE FUNCTION generate_employee_number(tenant_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  employee_num TEXT;
  exists_check BOOLEAN;
  counter INTEGER := 0;
  timestamp_part BIGINT;
  random_part INTEGER;
BEGIN
  LOOP
    -- Generate: EMP + last 6 digits of timestamp + 3 random digits + counter
    timestamp_part := (EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000);
    random_part := (RANDOM() * 1000)::INTEGER;
    employee_num := 'EMP' || 
                    LPAD(timestamp_part::TEXT, 6, '0') ||
                    LPAD(random_part::TEXT, 3, '0') ||
                    LPAD(counter::TEXT, 2, '0');
    
    -- Check if it exists
    SELECT EXISTS(
      SELECT 1 FROM staff 
      WHERE staff.tenant_id = tenant_id_param 
      AND staff.employee_number = employee_num
    ) INTO exists_check;
    
    -- If unique, return it
    IF NOT exists_check THEN
      RETURN employee_num;
    END IF;
    
    -- Increment counter to ensure uniqueness
    counter := counter + 1;
    
    -- Safety: prevent infinite loop
    IF counter > 100 THEN
      -- Fallback: use UUID portion
      employee_num := 'EMP' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 12);
      RETURN employee_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Main backfill: Create staff records for users with active memberships but no staff records
-- This finds all users who have active memberships with 'staff' role but don't have staff records yet
-- Note: This will create records for all staff role members, regardless of onboarding completion status
DO $$
DECLARE
  membership_record RECORD;
  profile_data RECORD;
  name_parts RECORD;
  employee_num TEXT;
  staff_id UUID;
  created_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Loop through all active memberships with 'staff' role where user doesn't have a staff record
  FOR membership_record IN
    SELECT 
      m.user_id,
      m.tenant_id,
      m.role
    FROM memberships m
    WHERE m.status = 'active'
      AND m.role = 'staff'  -- Only create for staff role members
      -- User doesn't have a staff record for this tenant
      AND NOT EXISTS(
        SELECT 1 FROM staff s
        WHERE s.user_id = m.user_id
          AND s.tenant_id = m.tenant_id
      )
  LOOP
    -- Get profile data
    SELECT 
      p.full_name,
      p.email,
      p.phone
    INTO profile_data
    FROM profiles p
    WHERE p.id = membership_record.user_id;
    
    -- Parse full_name
    SELECT * INTO name_parts FROM parse_full_name(profile_data.full_name);
    
    -- Generate unique employee number
    employee_num := generate_employee_number(membership_record.tenant_id);
    
    -- Create staff record
    INSERT INTO staff (
      tenant_id,
      user_id,
      employee_number,
      first_name,
      last_name,
      email,
      phone,
      status
    ) VALUES (
      membership_record.tenant_id,
      membership_record.user_id,
      employee_num,
      name_parts.first_name,
      name_parts.last_name,
      COALESCE(profile_data.email, NULL),
      COALESCE(profile_data.phone, NULL),
      'active'
    )
    ON CONFLICT (tenant_id, employee_number) DO NOTHING
    RETURNING id INTO staff_id;
    
    IF staff_id IS NOT NULL THEN
      created_count := created_count + 1;
      RAISE NOTICE 'Created staff record for user % in tenant % with employee number %', 
        membership_record.user_id, membership_record.tenant_id, employee_num;
    ELSE
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'Skipped user % in tenant % (employee number conflict)', 
        membership_record.user_id, membership_record.tenant_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Created % staff records, skipped % conflicts', 
    created_count, skipped_count;
END $$;

-- Cleanup: Drop helper functions (optional, can keep for future use)
-- DROP FUNCTION IF EXISTS parse_full_name(TEXT);
-- DROP FUNCTION IF EXISTS generate_employee_number(UUID);

-- Add comment for documentation
COMMENT ON FUNCTION parse_full_name IS 'Helper function to parse full_name into first_name and last_name for staff record creation';
COMMENT ON FUNCTION generate_employee_number IS 'Helper function to generate unique employee numbers per tenant';

