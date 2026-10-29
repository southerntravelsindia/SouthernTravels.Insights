// Loading and error states inside an opened drill-down row (H2): a muted line, or an amber message with Retry.
import type { DrillEntry } from './useDrill';

export function DrillStatus<S>({ state, onRetry }: { state: DrillEntry<S>; onRetry: () => void }) {
  if (state.status === 'loading') return <div className="ins01-drill-msg c-mut" role="status">Loading services…</div>;
  if (state.status === 'error')
    return (
      <div className="ins01-drill-msg" role="alert">
        <span className="c-warn fw7">{state.message}</span> <span className="c-mut">Reference: {state.traceId}</span>{' '}
        <button type="button" className="btn-clear" onClick={onRetry}>Retry</button>
      </div>
    );
  return null;
}
