-- Backfill existing hourly_rate values from staff table
INSERT INTO staff_hourly_rates (staff_id, tenant_id, hourly_rate, effective_date, created_at)
SELECT 
  s.id,
  s.tenant_id,
  s.hourly_rate,
  COALESCE(
    (SELECT MIN(shifts.start_time::DATE) FROM shifts WHERE shifts.staff_id = s.id),
    s.employment_start_date,
    s.created_at::DATE
  ) as effective_date,
  s.created_at
FROM staff s
WHERE s.hourly_rate IS NOT NULL
  AND s.hourly_rate > 0
ON CONFLICT (staff_id, effective_date) DO NOTHING;

