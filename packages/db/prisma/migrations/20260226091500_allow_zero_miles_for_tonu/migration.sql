ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_miles_check;

ALTER TABLE loads
  ADD CONSTRAINT loads_miles_check
  CHECK (miles > 0 OR status = 'TONU');
