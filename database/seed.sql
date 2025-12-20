-- MANUAL ADMIN ACCOUNT
-- Password hash must be generated manually

INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@example.com',
  '$2b$12$Hd3OEZ.aAT7/THI8qs6.3.JvpQFHT08QUiW7WZSCjh8mkYUbDRHwW',
  'admin'
);

-- Optional admin settings
INSERT INTO admins (user_id, super_admin)
SELECT id, TRUE
FROM users
WHERE email = 'admin@example.com';