-- Rollback Script: Undo Role Migration (Generated: 2026-03-02T02:40:32.344Z)
-- Run with: psql -f rollback-roles-2026-03-02T02-40-32-343Z.sql

BEGIN;

-- Undo: saencrystal.global@gmail.com "Admin" → "Admin Director"
DELETE FROM public.user_roles WHERE user_id = 'eaf8db55-de38-4c39-a93e-999a9a10266f' AND role_id = 'edeacb58-fbd5-4bbd-812b-e5eb48ae0788';

-- Undo: saencrystal@gmail.com "Admin" → "Admin Director"
DELETE FROM public.user_roles WHERE user_id = '3fcf7d2f-901e-4acb-8d03-ae13dc4e06e1' AND role_id = 'edeacb58-fbd5-4bbd-812b-e5eb48ae0788';

COMMIT;
-- End of rollback script
