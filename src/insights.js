/**
 * insights.js
 * Senior-level financial analysis engine.
 * Generates contextual, advisor-quality text insights from transaction data.
 */

const CURRENCY = '₱';

/**
 * @param {object} params
 * @param {number}   params.totalBalance   - Sum of all account balances
 * @param {number}   params.thisMonthIncome
 * @param {number}   params.thisMonthExpense
 * @param {number}   params.lastMonthExpense
 * @param {number}   params.thisWeekExpense
 * @param {number}   params.lastWeekExpense
 * @param {{ name: string, thisWeek: number, lastWeek: number, thisMonth: number }[]} params.categoryBreakdown
 * @param {number}   params.avgDailySpend  - This month's average daily spend
 * @returns {{ type: 'positive'|'warning'|'alert'|'info'|'tip', icon: string, text: string }[]}
 */
export function generateInsights({
  totalBalance,
  thisMonthIncome,
  thisMonthExpense,
  lastMonthExpense,
  thisWeekExpense,
  lastWeekExpense,
  categoryBreakdown = [],
  avgDailySpend,
}) {
  const insights = [];
  const fmt = (n) => `${CURRENCY}${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── 1. Savings Rate ───────────────────────────────────────────────────────
  if (thisMonthIncome > 0) {
    const saved = thisMonthIncome - thisMonthExpense;
    const savingsRate = (saved / thisMonthIncome) * 100;
    if (savingsRate >= 20) {
      insights.push({
        type: 'positive',
        icon: '🏆',
        text: `<strong>Excellent savings rate!</strong> You've saved ${fmt(saved)} (${savingsRate.toFixed(0)}%) of your income this month. Financial advisors recommend saving at least 20% — you're on track.`,
      });
    } else if (savingsRate >= 10) {
      insights.push({
        type: 'info',
        icon: '💡',
        text: `You're saving ${savingsRate.toFixed(0)}% of your income this month (${fmt(saved)}). Aim for 20%+ to build a strong financial cushion. Try trimming one discretionary category.`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        text: `<strong>Low savings rate:</strong> Only ${savingsRate.toFixed(0)}% of income saved this month. High spending relative to income leaves little buffer for emergencies. Review your largest expense categories below.`,
      });
    } else if (saved < 0) {
      insights.push({
        type: 'alert',
        icon: '🚨',
        text: `<strong>You're spending more than you earn.</strong> Your expenses exceed income by ${fmt(Math.abs(saved))} this month. This is unsustainable — identify and cut non-essential expenses immediately.`,
      });
    }
  }

  // ── 2. Month-over-month spending trend ────────────────────────────────────
  if (lastMonthExpense > 0 && thisMonthExpense > 0) {
    const momPct = ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
    if (momPct > 20) {
      insights.push({
        type: 'alert',
        icon: '📈',
        text: `Your total spending is <strong>${momPct.toFixed(0)}% higher</strong> than last month (${fmt(thisMonthExpense)} vs ${fmt(lastMonthExpense)}). Investigate what's driving the increase — one spike category can distort your entire budget.`,
      });
    } else if (momPct < -10) {
      insights.push({
        type: 'positive',
        icon: '📉',
        text: `<strong>Great control!</strong> You've reduced spending by ${Math.abs(momPct).toFixed(0)}% compared to last month. Keep it consistent to accelerate your savings goals.`,
      });
    }
  }

  // ── 3. Week-over-week trend ────────────────────────────────────────────────
  if (lastWeekExpense > 0 && thisWeekExpense > 0) {
    const wowPct = ((thisWeekExpense - lastWeekExpense) / lastWeekExpense) * 100;
    if (wowPct > 30) {
      insights.push({
        type: 'warning',
        icon: '🔥',
        text: `Spending spiked <strong>${wowPct.toFixed(0)}% this week</strong> vs. last week (${fmt(thisWeekExpense)} vs ${fmt(lastWeekExpense)}). Weekend spending or impulsive purchases often drive short-term spikes.`,
      });
    }
  }

  // ── 4. Category anomalies (weekly) ────────────────────────────────────────
  const topCategories = [...categoryBreakdown]
    .filter(c => c.lastWeek > 0)
    .sort((a, b) => {
      const pa = (a.thisWeek - a.lastWeek) / a.lastWeek;
      const pb = (b.thisWeek - b.lastWeek) / b.lastWeek;
      return pb - pa;
    });

  for (const cat of topCategories.slice(0, 2)) {
    const pct = ((cat.thisWeek - cat.lastWeek) / cat.lastWeek) * 100;
    if (pct >= 20) {
      insights.push({
        type: 'warning',
        icon: '🔍',
        text: `You spent <strong>${pct.toFixed(0)}% more on ${cat.name}</strong> this week than last week (${fmt(cat.thisWeek)} vs ${fmt(cat.lastWeek)}). Consider setting a weekly cap for this category.`,
      });
    }
  }

  // ── 5. Emergency Fund Score ────────────────────────────────────────────────
  if (avgDailySpend > 0 && totalBalance >= 0) {
    const monthsOfRunway = totalBalance / (avgDailySpend * 30);
    if (monthsOfRunway < 1) {
      insights.push({
        type: 'alert',
        icon: '🆘',
        text: `<strong>Critical: Less than 1 month of expenses in reserve.</strong> Your current balance (${fmt(totalBalance)}) covers only ${(monthsOfRunway * 30).toFixed(0)} days of spending. Build an emergency fund of 3–6 months of expenses as the top priority.`,
      });
    } else if (monthsOfRunway < 3) {
      insights.push({
        type: 'warning',
        icon: '🛡️',
        text: `Your balance covers about <strong>${monthsOfRunway.toFixed(1)} months</strong> of expenses. Financial advisors recommend a 3–6 month emergency fund. You're getting there — keep saving.`,
      });
    } else if (monthsOfRunway >= 6) {
      insights.push({
        type: 'positive',
        icon: '🛡️',
        text: `<strong>Strong emergency fund!</strong> Your balance covers ${monthsOfRunway.toFixed(1)} months of expenses. Consider moving surplus beyond 6 months into higher-yield instruments like time deposits or index funds.`,
      });
    }
  }

  // ── 6. Top spending category tip ─────────────────────────────────────────
  const topCat = [...categoryBreakdown].sort((a, b) => b.thisMonth - a.thisMonth)[0];
  if (topCat && topCat.thisMonth > 0 && thisMonthExpense > 0) {
    const pct = ((topCat.thisMonth / thisMonthExpense) * 100).toFixed(0);
    if (Number(pct) > 35) {
      insights.push({
        type: 'tip',
        icon: '💡',
        text: `<strong>${topCat.name}</strong> accounts for ${pct}% of your monthly expenses (${fmt(topCat.thisMonth)}). When a single category exceeds 35% of spending, it's worth reviewing if it aligns with your priorities.`,
      });
    }
  }

  // ── 7. No-spending encouragement ──────────────────────────────────────────
  if (insights.length === 0 && thisMonthExpense === 0) {
    insights.push({
      type: 'info',
      icon: '📊',
      text: 'No transactions yet this month. Start recording your income and expenses to get personalized financial insights.',
    });
  }

  return insights;
}

/** Compute ISO week-start (Monday) for a given date string */
export function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a number as currency */
export function fmt(n) {
  return `${CURRENCY}${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Today's date as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/** Start of current month as YYYY-MM-DD */
export function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Start of last month */
export function lastMonthStart() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** End of last month */
export function lastMonthEnd() {
  const d = new Date();
  d.setDate(0); // last day of previous month
  return d.toISOString().split('T')[0];
}

/** N days ago as YYYY-MM-DD */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
