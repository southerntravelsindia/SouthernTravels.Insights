// Pagination buttons, as the Razor Pager (Reports/ReportPage.cs): ‹ 1 … 4 5 6 … 12 ›, at most seven numbers.

export interface PageButton {
  label: string;
  /** Target page; null when the button is disabled or an ellipsis. */
  page: number | null;
  active: boolean;
}

export function pageButtons(page: number, totalPages: number): PageButton[] {
  const pages = Math.max(1, totalPages);
  const p = Math.min(Math.max(1, page), pages);
  const nums: (number | null)[] = [];
  const range = (a: number, b: number) => { for (let i = a; i <= b; i++) nums.push(i); };
  if (pages <= 7) range(1, pages);
  else if (p <= 4) { range(1, 5); nums.push(null, pages); }
  else if (p >= pages - 3) { nums.push(1, null); range(pages - 4, pages); }
  else nums.push(1, null, p - 1, p, p + 1, null, pages);

  return [
    { label: '‹', page: p <= 1 ? null : p - 1, active: false },
    ...nums.map((n) => (n === null ? { label: '…', page: null, active: false } : { label: String(n), page: n, active: n === p })),
    { label: '›', page: p >= pages ? null : p + 1, active: false },
  ];
}
