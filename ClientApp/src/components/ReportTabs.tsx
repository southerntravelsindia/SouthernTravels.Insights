// View tabs (Views/Shared/_KpisTabsToolbar.cshtml): plain links that change the URL query.
import { Link } from 'react-router';

export function ReportTabs<K extends string>({ tabs, active, hrefFor }: {
  tabs: { key: K; label: string }[];
  active: K;
  hrefFor: (key: K) => string;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <Link key={t.key} role="tab" aria-selected={t.key === active} className={t.key === active ? 'tab active' : 'tab'} to={hrefFor(t.key)}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
