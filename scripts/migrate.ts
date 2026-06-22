// Run: npx ts-node scripts/migrate.ts
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin','staff')),
        email_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Course sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_sessions (
        id SERIAL PRIMARY KEY,
        course_type VARCHAR(50) DEFAULT 'g2g',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        location VARCHAR(255),
        capacity INTEGER DEFAULT 30,
        seats_remaining INTEGER DEFAULT 30,
        price NUMERIC(10,2) DEFAULT 0,
        early_bird_price NUMERIC(10,2),
        early_bird_ends DATE,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','open','full','closed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Seat locks (fallback — primary locking via Redis)
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_locks (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES course_sessions(id),
        user_id INTEGER,
        lock_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_id INTEGER REFERENCES course_sessions(id),
        amount NUMERIC(10,2) NOT NULL,
        vat_amount NUMERIC(10,2) DEFAULT 0,
        wht_amount NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2) NOT NULL,
        coupon_code VARCHAR(50),
        discount_amount NUMERIC(10,2) DEFAULT 0,
        payment_method VARCHAR(20),
        omise_charge_id VARCHAR(255),
        idempotency_key VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Enrollments
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_id INTEGER REFERENCES course_sessions(id),
        order_id INTEGER REFERENCES orders(id),
        qr_token VARCHAR(255) UNIQUE,
        checked_in_at TIMESTAMPTZ,
        checked_in_by INTEGER REFERENCES users(id),
        certificate_url TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(30) UNIQUE NOT NULL,
        order_id INTEGER REFERENCES orders(id),
        user_id INTEGER REFERENCES users(id),
        company_name VARCHAR(255),
        tax_id VARCHAR(50),
        address TEXT,
        subtotal NUMERIC(10,2),
        vat NUMERIC(10,2),
        wht NUMERIC(10,2),
        total NUMERIC(10,2),
        pdf_url TEXT,
        issued_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Waitlist
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES course_sessions(id),
        user_id INTEGER REFERENCES users(id),
        email VARCHAR(255),
        name VARCHAR(255),
        notified_at TIMESTAMPTZ,
        claim_token VARCHAR(255),
        claim_expires_at TIMESTAMPTZ,
        claimed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Certificates
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        enrollment_id INTEGER REFERENCES enrollments(id),
        user_id INTEGER REFERENCES users(id),
        verify_token VARCHAR(255) UNIQUE NOT NULL,
        pdf_url TEXT,
        issued_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Feedback
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES course_sessions(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Email queue (for Vercel Cron)
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        template VARCHAR(50),
        template_data JSONB,
        send_at TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Invoice number sequence
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1
    `)

    await client.query('COMMIT')
    console.log('✅ Migration complete — all tables created')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
