// Display text and URLs the Razor shell writes on the mount element (Views/TicketServiceStatus/IndexReact.cshtml).
// Nothing here is used for identity or access: the BFF decides that from the server session.

export interface PageConfig {
  title: string;
  description: string;
  /** Name in the "Files assigned to you" legend. */
  userName: string;
  /** BFF base, e.g. "/api/ins01/" (honours a virtual directory). */
  apiBase: string;
  loginUrl: string;
}

export const ROOT_ID = 'ins01-root';

export function pageConfig(): PageConfig {
  const d = document.getElementById(ROOT_ID)?.dataset ?? {};
  return {
    title: d.title ?? 'Ticket & Service Status',
    description: d.description ?? '',
    userName: d.user ?? '',
    apiBase: d.api ?? '/api/ins01/',
    loginUrl: d.login ?? '/Account/Login',
  };
}
