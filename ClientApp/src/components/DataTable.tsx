// Report table: the desktop table and the tablet/phone cards (< 1150px) come from one column definition (D5, D6).
// Replaces Infrastructure/CardCss.cs and AlignCss.cs: instead of generated nth-child CSS, each cell carries
//   data-label  → the card label before its value (the column's cardLabel, else its header),
//   ct          → the card title cell, cx → hidden on the card until the row is opened,
//   al-l/c/r    → alignment by column heading (styles/ins01.css).
// Grouped tables put each row and its drill-down row in their own <tbody> (zebra striping, as the Razor page).
import { Fragment, type ReactNode } from 'react';
import { cx } from './Cell';

export interface Column<T> {
  key: string;
  header: string;
  /** Label on the tablet/phone card; defaults to the header. */
  cardLabel?: string;
  thClass?: string;
  tdClass?: string;
  align?: 'left' | 'center' | 'right';
  /** Card role: the title line, the top-right chevron (lead), or an extra shown only when the card is opened. */
  card?: 'title' | 'lead' | 'extra';
  /** Cell tooltip (e.g. a long service name that is cut off). */
  tdTitle?: (row: T) => string | undefined;
  /** Replaces the whole <td> (e.g. the amber "Pending" cell); return null to use render(). */
  cell?: (row: T) => { className?: string; content: ReactNode } | null;
  render: (row: T) => ReactNode;
}

export interface Drill<T> {
  isOpen: (row: T) => boolean;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  className: string;
  /** Extra classes on the row (e.g. "mine"); main-table rows also get "row" and, when expanded, "open". */
  rowClassName?: (row: T) => string | undefined;
  /** Main tables (rows with class "row", one tbody each). Sub-tables leave this off. */
  grouped?: boolean;
  drill?: Drill<T>;
  /** Wrap header text in <div class="l"> (the generic .gt table centres it). */
  headerWrap?: boolean;
  emptyText?: string;
}

const alignClass = { left: 'al-l', center: 'al-c', right: 'al-r' } as const;

export function DataTable<T>(p: DataTableProps<T>) {
  const cols = p.columns;

  const cells = (row: T) =>
    cols.map((c) => {
      const custom = c.cell?.(row) ?? null;
      const label = c.card === 'title' || c.card === 'lead' || c.header.trim() === '' ? undefined : (c.cardLabel ?? c.header.trim());
      return (
        <td
          key={c.key}
          className={cx(custom ? custom.className : c.tdClass, c.align && alignClass[c.align], c.card === 'title' && 'ct', c.card === 'extra' && 'cx')}
          data-label={label}
          title={c.tdTitle?.(row)}
        >
          {custom ? custom.content : c.render(row)}
        </td>
      );
    });

  const rowFor = (row: T) => {
    const open = p.drill?.isOpen(row) ?? false;
    return (
      <tr className={cx(p.grouped && 'row', p.rowClassName?.(row), open && 'open')}>
        {cells(row)}
      </tr>
    );
  };

  return (
    <table className={p.className}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} className={c.thClass}>{p.headerWrap ? <div className="l">{c.header}</div> : c.header}</th>
          ))}
        </tr>
      </thead>
      {p.grouped ? (
        p.rows.map((row) => (
          <tbody key={p.rowKey(row)}>
            {rowFor(row)}
            {p.drill && (
              <tr className="drill">
                <td colSpan={cols.length}>{p.drill.isOpen(row) ? p.drill.render(row) : null}</td>
              </tr>
            )}
          </tbody>
        ))
      ) : (
        <tbody>
          {p.rows.map((row) => <Fragment key={p.rowKey(row)}>{rowFor(row)}</Fragment>)}
        </tbody>
      )}
      {p.rows.length === 0 && p.emptyText && (
        <tbody>
          <tr><td colSpan={cols.length} className="empty">{p.emptyText}</td></tr>
        </tbody>
      )}
    </table>
  );
}
