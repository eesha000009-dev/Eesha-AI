# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies (python for code execution, git, etc.)
# NOTE: Removed sqlite3 since we now use Supabase PostgreSQL
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7860
ENV HOST=0.0.0.0

# Create directories
RUN mkdir -p /app/workspace /app/data

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy pg module for DB migration
COPY --from=builder /app/node_modules/pg ./node_modules/pg

# Copy SQL migration file
COPY --from=builder /app/supabase-update-template.sql /app/supabase-update-template.sql

# Set environment variables for runtime
# NOTE: The following MUST be set as HF Spaces Secrets:
#   DATABASE_URL, DIRECT_URL — Supabase PostgreSQL connection strings
#   NEXTAUTH_SECRET, NEXTAUTH_URL — NextAuth.js configuration
#   SUPABASE_URL, SUPABASE_SERVICE_KEY — Supabase Auth admin (server-side only)
#   SUPABASE_ANON_KEY — Supabase Auth public key (server-side only, NOT NEXT_PUBLIC_)
#   GITHUB_ID, GITHUB_SECRET — GitHub OAuth
#   AGENT1_API_KEY, AGENT2_API_KEY, AGENT3_API_KEY — NVIDIA API keys
ENV WORKSPACE_ROOT=/app/workspace

# Expose HF Space port
EXPOSE 7860

# Create startup script
RUN cat > /app/start.sh << 'STARTUP'
#!/bin/sh
cd /app

echo "Eesha AI starting on port 7860..."
echo "Database: PostgreSQL (Supabase)"
echo "Auth: NextAuth.js"

# Run email template migration (updates Supabase to send OTP codes instead of links)
echo "Running email template migration..."
node -e "
const pg = require('pg');
const fs = require('fs');

async function migrate() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.log('DIRECT_URL not set, skipping email template migration');
    return;
  }

  // Disable TLS verification for Supabase pooler
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const pool = new pg.Pool({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  
  try {
    const sql = fs.readFileSync('/app/supabase-update-template.sql', 'utf8');
    await pool.query(sql);
    console.log('Email template migration completed successfully!');
  } catch (e) {
    console.error('Email template migration failed (non-fatal):', e.message);
  } finally {
    await pool.end();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
}

migrate().then(() => {
  // Start the app
  require('./server.js');
});
" &

# Wait a moment for migration, then start server
sleep 2
node server.js
STARTUP
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
