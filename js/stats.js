// חישוב טווח מחזור חודשי (לפי יום התחלה נבחר) ואגרגציה סטטיסטית

function clampToMonthDay(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function getCycleRange(refDate, cycleStartDay) {
  const d = refDate instanceof Date ? refDate : new Date(refDate);
  let startMonth = d.getMonth();
  let startYear = d.getFullYear();

  if (d.getDate() < cycleStartDay) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const start = clampToMonthDay(startYear, startMonth, cycleStartDay);

  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }
  const end = clampToMonthDay(endYear, endMonth, cycleStartDay);
  end.setDate(end.getDate() - 1);

  return { start: start, end: end };
}

function isDateInRange(isoDate, start, end) {
  const d = new Date(isoDate + 'T00:00:00');
  return d >= start && d <= end;
}

function getTransactionsInCycle(transactions, refDate, cycleStartDay) {
  const range = getCycleRange(refDate, cycleStartDay);
  return transactions.filter(function (t) {
    return isDateInRange(t.date, range.start, range.end);
  });
}

function summarize(transactions) {
  let income = 0;
  let expense = 0;
  transactions.forEach(function (t) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  return { income: income, expense: expense, balance: income - expense };
}

function aggregateByCategory(transactions, type) {
  const totals = {};
  transactions.filter(function (t) { return t.type === type; }).forEach(function (t) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return Object.keys(totals)
    .map(function (cat) { return { category: cat, total: totals[cat] }; })
    .sort(function (a, b) { return b.total - a.total; });
}
