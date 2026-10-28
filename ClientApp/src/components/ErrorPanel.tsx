// Shown in the results card when a list call fails (H2): a safe message, the correlation id for support, and Retry.

export function ErrorPanel({ message, traceId, onRetry }: { message: string; traceId: string; onRetry?: () => void }) {
  return (
    <div className="card" role="alert">
      <div className="empty">
        <div className="c-warn fw7">{message}</div>
        {traceId && <div className="fs11 mt3">Reference: {traceId}</div>}
        {onRetry && <button type="button" className="btn-clear mt3 ins01-retry" onClick={onRetry}>Retry</button>}
      </div>
    </div>
  );
}
