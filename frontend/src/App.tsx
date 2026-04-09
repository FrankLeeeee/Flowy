import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Inbox from './pages/Inbox';
import ProjectDetail from './pages/ProjectDetail';
import Runners from './pages/Runners';

function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <div key={location.pathname} className="motion-page min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/runners" element={<Runners />} />
            <Route path="/usage" element={<Navigate to="/runners" replace />} />
            <Route path="/settings" element={<Navigate to="/runners" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
