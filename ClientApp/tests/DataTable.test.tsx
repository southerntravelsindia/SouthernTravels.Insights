import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DataTable, type Column } from '../src/components/DataTable';

afterEach(cleanup);

interface R { id: number; name: string; amount: string }
const cols: Column<R>[] = [
  { key: 'chev', header: '', tdClass: 'chev', card: 'lead', render: () => '>' },
  { key: 'name', header: 'Vendor Name', align: 'left', card: 'title', render: (r) => r.name },
  { key: 'amt', header: 'Balance Pending', cardLabel: 'Balance', align: 'right', card: 'extra', render: (r) => r.amount },
  { key: 'plain', header: 'City', render: () => 'Agra' },
];
const rows: R[] = [{ id: 1, name: 'A', amount: '₹1' }, { id: 2, name: 'B', amount: '₹2' }];

describe('DataTable', () => {
  it('builds desktop headers and card labels from one column definition', () => {
    const { container } = render(<DataTable className="gt cards t-x" columns={cols} rows={rows} rowKey={(r) => r.id} grouped />);
    expect([...container.querySelectorAll('th')].map((th) => th.textContent)).toEqual(['', 'Vendor Name', 'Balance Pending', 'City']);
    const td = container.querySelectorAll('tbody tr.row')[0]!.querySelectorAll('td');
    expect(td[0]!.className).toBe('chev');
    expect(td[0]!.hasAttribute('data-label')).toBe(false); // lead: no label
    expect(td[1]!.className).toBe('al-l ct'); // title: no label
    expect(td[1]!.hasAttribute('data-label')).toBe(false);
    expect(td[2]!.className).toBe('al-r cx');
    expect(td[2]!.getAttribute('data-label')).toBe('Balance');
    expect(td[3]!.getAttribute('data-label')).toBe('City');
  });

  it('puts each grouped row and its drill-down row in their own tbody', () => {
    const { container } = render(
      <DataTable className="tt" columns={cols} rows={rows} rowKey={(r) => r.id} grouped
        drill={{ isOpen: (r) => r.id === 2, render: (r) => <span className="d">{r.name}</span> }} />,
    );
    const bodies = container.querySelectorAll('tbody');
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.querySelector('tr.drill td')!.getAttribute('colspan')).toBe('4');
    expect(bodies[0]!.querySelector('.d')).toBeNull(); // closed rows render no drill content
    expect(bodies[1]!.querySelector('tr.row')!.classList.contains('open')).toBe(true);
    expect(bodies[1]!.querySelector('.d')!.textContent).toBe('B');
  });

  it('shows the empty text across all columns', () => {
    const { container } = render(<DataTable className="tt" columns={cols} rows={[]} rowKey={(r) => r.id} grouped emptyText="No tickets found." />);
    const td = container.querySelector('td.empty')!;
    expect(td.textContent).toBe('No tickets found.');
    expect(td.getAttribute('colspan')).toBe('4');
  });
});
