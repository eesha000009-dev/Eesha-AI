-- Update Supabase email templates to use OTP codes instead of links
-- Run this migration once to change from {{ .ConfirmationURL }} to {{ .Token }}

-- Update "Confirm signup" template to show 6-digit OTP code
UPDATE auth.config SET value = '
<h2>Confirm your signup</h2>
<p>Enter this 6-digit code to verify your email:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>
' WHERE name = 'mailer_signup_template';

-- Update "Magic Link" template to show 6-digit OTP code
UPDATE auth.config SET value = '
<h2>Your verification code</h2>
<p>Enter this 6-digit code to verify your identity:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>
' WHERE name = 'mailer_magiclink_template';

-- Update site URL
UPDATE auth.config SET value = 'https://fuhaddesmond-eesha-ai.hf.space' WHERE name = 'site_url';

-- Update URI allow list
UPDATE auth.config SET value = 'https://fuhaddesmond-eesha-ai.hf.space/**' WHERE name = 'uri_allow_list';

-- Set OTP length to 6 digits
UPDATE auth.config SET value = '6' WHERE name = 'mailer_otp_length';
