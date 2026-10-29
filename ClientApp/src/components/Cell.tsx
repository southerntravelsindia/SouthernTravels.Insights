// Small cell pieces shared by the report tables (Infrastructure/Ui.cs): badges, pills, stacked lines, file numbers.
import { Fragment, type ReactNode } from 'react';
import { fileNoParts, tone, typeTone } from '../lib/format';

const cx = (...c: (string | false | null | undefined)[]): string | undefined => c.filter(Boolean).join(' ') || undefined;

/** Status badge (ticket / service / OPS statuses). */
export const Badge = ({ status, className }: { status: string; className?: string }) => (
  <span className={cx('bdg', tone(status), className)}>{status}</span>
);

/** Service type pill. */
export const Pill = ({ type, className }: { type: string; className?: string }) => (
  <span className={cx('bdg', typeTone(type), className)}>{type}</span>
);

/** One stacked line inside a cell. */
export const Ln = ({ children, className, title }: { children: ReactNode; className?: string; title?: string }) => (
  <div className="ln">
    <span className={className} title={title}>{children}</span>
  </div>
);

/** File number that wraps at its slashes (FN/000007/2026-27/DEL001). */
export const FileNo = ({ file, className }: { file: string; className?: string }) => (
  <div className="ln">
    <span className={className}>
      {fileNoParts(file).map((p, i) => (
        <Fragment key={i}>{i > 0 && <>/<wbr /></>}{p}</Fragment>
      ))}
    </span>
  </div>
);

export { cx };
