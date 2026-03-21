import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { dbQuery } from '../db';
import { PieChart } from '../components/PieChart';
import { generateInsights, fmt, monthStart, daysAgo } from '../insights';

export function DashboardPage({ user }) {
  const [data, setData] = useState({
    accounts: [],
    categories: [],
    recentTransactions: [],
    thisMonthSummary: { income: 0, expense: 0 },
    lastMonthExpense: 0,
    dailyTrend: [], // { date, amount }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const mStart = monthStart();
      const SevenDaysAgo = daysAgo(7);

      // 1. Total Balance & Accounts
      const accounts = await dbQuery('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

      // 2. This Month Summary
      const monthlyData = await dbQuery(`
        SELECT type, SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND date >= ?
        GROUP BY type
      `, [user.id, mStart]);

      const thisMonthSummary = {
        income: monthlyData.find(d => d.type === 'income')?.total || 0,
        expense: monthlyData.find(d => d.type === 'expense')?.total || 0,
      };

      // 3. Category Breakdown (for Pie)
      const categoryData = await dbQuery(`
        SELECT c.name, c.color, SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.date >= ? AND t.type = 'expense'
        GROUP BY c.id
      `, [user.id, mStart]);

      // 4. 7-Day Trend (uPlot)
      const trendData = await dbQuery(`
        SELECT date, SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND date >= ?
        GROUP BY date
        ORDER BY date ASC
      `, [user.id, SevenDaysAgo]);

      // 5. Weekly/Monthly Comparison Logic for Insights
      const lastMonthExpRes = await dbQuery(`
        SELECT SUM(amount) as total FROM transactions
        WHERE user_id = ? AND type = 'expense'
        AND date >= date('now', 'start of month', '-1 month')
        AND date < date('now', 'start of month')
      `, [user.id]);

      setData({
        accounts,
        totalBalance,
        thisMonthSummary,
        categoryBreakdown: categoryData,
        dailyTrend: trendData,
        lastMonthExpense: lastMonthExpRes[0]?.total || 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // Generate Insights
  const insights = useMemo(() => {
    if (loading) return [];
    return generateInsights({
      totalBalance: data.totalBalance,
      thisMonthIncome: data.thisMonthSummary.income,
      thisMonthExpense: data.thisMonthSummary.expense,
      lastMonthExpense: data.lastMonthExpense,
      categoryBreakdown: data.categoryBreakdown?.map(c => ({
        name: c.name,
        thisMonth: c.total
      })) || [],
      avgDailySpend: data.thisMonthSummary.expense / 30, // Rough estimate
    });
  }, [data, loading]);

  if (loading) return h('div', { class: 'loader' }, h('div', { class: 'spinner' }));

  return h('div', { class: 'page-content' },
    h('header', { class: 'mb-6' },
      h('p', { class: 'text-muted font-medium' }, `Hello, ${user.first_name}`),
      h('h1', { class: 'text-2xl font-extrabold' }, 'Financial Overview')
    ),

    // Balance Card
    h('div', { class: 'balance-hero mb-6' },
      h('p', { class: 'balance-label' }, 'Net Worth'),
      h('div', { class: 'balance-amount' },
        h('span', { class: 'currency' }, '₱'),
        data.totalBalance.toLocaleString()
      ),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat-item' },
          h('p', { class: 'stat-lbl' }, 'Monthly Income'),
          h('p', { class: 'stat-val text-accent' }, fmt(data.thisMonthSummary.income))
        ),
        h('div', { class: 'stat-item' },
          h('p', { class: 'stat-lbl' }, 'Monthly Expense'),
          h('p', { class: 'stat-val text-danger' }, fmt(data.thisMonthSummary.expense))
        )
      )
    ),

    // Insights
    insights.length > 0 && h('div', { class: 'mb-6 flex flex-col gap-3' },
      h('p', { class: 'section-label' }, 'Smart Insights'),
      insights.slice(0, 3).map((insight, i) =>
        h('div', { key: i, class: `insight-card ${insight.type}` },
          h('span', { class: 'insight-icon' }, insight.icon),
          h('p', { class: 'insight-text', dangerouslySetInnerHTML: { __html: insight.text } })
        )
      )
    ),

    // Pie Chart
    h('div', { class: 'chart-wrap mb-6 px-4' },
      h('p', { class: 'chart-title' }, 'Expense Breakdown'),
      h(PieChart, {
        slices: data.categoryBreakdown.map(c => ({
          label: c.name,
          value: c.total,
          color: c.color
        }))
      })
    ),

    // uPlot Trend
    h('div', { class: 'chart-wrap mb-6 px-4' },
      h('p', { class: 'chart-title' }, '7-Day Trend'),
      h(TrendChart, { dailyTrend: data.dailyTrend })
    )
  );
}

/**
 * TrendChart wrapper for uPlot.
 * Optimized for small mobile screens.
 */
function TrendChart({ dailyTrend }) {
  const containerRef = (el) => {
    if (!el || !dailyTrend.length) return;

    // Prepare data: [[timestamps], [values]]
    const x = dailyTrend.map(d => new Date(d.date).getTime() / 1000);
    const y = dailyTrend.map(d => d.total);

    const opts = {
      width: el.clientWidth,
      height: 180,
      class: 'u-wrap',
      padding: [10, 0, 0, 0],
      series: [
        {},
        {
          show: true,
          spanGaps: false,
          stroke: '#6C63FF',
          width: 2,
          fill: 'rgba(108, 99, 255, 0.1)',
        },
      ],
      axes: [
        { grid: { show: false }, font: '10px Inter', stroke: '#606080' },
        { font: '10px Inter', stroke: '#606080', values: (u, val) => '₱' + (val >= 1000 ? (val/1000).toFixed(1)+'k' : val) }
      ],
      cursor: { show: false },
    };

    const u = new uPlot(opts, [x, y], el);
    return () => u.destroy();
  };

  return h('div', {
    ref: containerRef,
    style: 'width: 100%; height: 180px'
  }, !dailyTrend.length && h('div', { class: 'flex-center h-full text-dim uppercase text-xs' }, 'No recent trend data'));
}
