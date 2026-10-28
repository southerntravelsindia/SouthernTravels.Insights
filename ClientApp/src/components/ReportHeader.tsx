// Title row with the "i" description tooltip and the Period selector (Views/Shared/_ReportHeader.cshtml).
// Period is visual only until Phase 5 (four options, applied from the URL).

export const PERIOD_OPTIONS = ['All time', 'Today', 'Last 5 Days', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Custom'];

export function ReportHeader({ title, description, period = 'All time' }: { title: string; description: string; period?: string }) {
  return (
    <div className="title-row">
      <h2>{title}</h2>
      <button type="button" className="info-btn" aria-label="About this report">i</button>
      <div className="desc-pop" role="tooltip">{description}</div>
      <div className="title-ctl">
        <span className="cap">Period</span>
        <select aria-label="Period" defaultValue={period}>
          {PERIOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}
