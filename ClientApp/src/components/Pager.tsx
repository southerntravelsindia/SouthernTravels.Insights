// Pagination (Views/Shared/_Pager.cshtml): always visible (D9), links change the URL query.
import { Link } from 'react-router';
import { pageButtons } from '../lib/pager';

export function Pager({ label, page, totalPages, hrefFor }: {
  label: string;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="lbl">{label}</span>
      <div className="btns">
        {pageButtons(page, totalPages).map((b, i) =>
          b.page === null ? (
            <span key={i} className={b.active ? 'pg active' : 'pg'} aria-disabled="true">{b.label}</span>
          ) : (
            <Link key={i} className={b.active ? 'pg active' : 'pg'} to={hrefFor(b.page)} aria-current={b.active ? 'page' : undefined}>
              {b.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
