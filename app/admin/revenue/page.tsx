export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import RevenueClient from './RevenueClient'

export default async function Page() {
  const [summary, monthly, sessions, recent] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='paid') as total_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid'), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status='paid' AND paid_at >= NOW() - INTERVAL '30 days') as orders_30d,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND paid_at >= NOW() - INTERVAL '30 days'), 0) as revenue_30d
      FROM orders
    `),
    pool.query(`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders WHERE status='paid' AND paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `),
    pool.query(`
      SELECT cs.title, cs.start_date,
        COUNT(e.id) as enrolled,
        cs.capacity,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM course_sessions cs
      LEFT JOIN enrollments e ON e.session_id = cs.id AND e.status='active'
      LEFT JOIN orders o ON o.id = e.order_id AND o.status='paid'
      GROUP BY cs.id ORDER BY cs.start_date DESC LIMIT 10
    `),
    pool.query(`
      SELECT o.id, o.total_amount, o.payment_method, o.paid_at, o.status,
             u.name, u.email, cs.title as session_title
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN course_sessions cs ON o.session_id = cs.id
      ORDER BY o.created_at DESC LIMIT 20
    `),
  ])

  return <RevenueClient
    summary={summary.rows[0]}
    monthly={monthly.rows}
    sessions={sessions.rows}
    recent={recent.rows}
  />
}
