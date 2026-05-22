-- OTP verification migration for Validify
-- Run this only if you want to manually add the OTP columns.
-- The updated server.js also creates these columns automatically on startup.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS otp_verified TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS otp_code_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS otp_expires DATETIME NULL,
  ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0;

-- Keep existing accounts usable. New registrations are inserted with otp_verified = 0.
UPDATE users
SET otp_verified = 1
WHERE otp_verified IS NULL;
