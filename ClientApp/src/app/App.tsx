// The page runs at /Operations/TicketServiceStatus (or under a virtual directory); every state is in the query string,
// so one route serves it.
import { BrowserRouter, Route, Routes } from 'react-router';
import { Ins01Page } from '../reports/ins01/Ins01Page';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Ins01Page />} />
      </Routes>
    </BrowserRouter>
  );
}
