// The report chunk: page frame, page and styles (the Insights site.css as is, plus ins01.css), loaded only after sign-in.
import '../../../../wwwroot/css/site.css';
import '../../styles/ins01.css';
import { AppShell } from '../../app/AppShell';
import type { UserSession } from '../../lib/auth';
import { Ins01Page } from './Ins01Page';

export default function ReportEntry({ user }: { user: UserSession }) {
  return (
    <AppShell user={user}>
      <Ins01Page userName={user.name} />
    </AppShell>
  );
}
