import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Inbox from './pages/Inbox';
import ProjectDetail from './pages/ProjectDetail';
import Runners from './pages/Runners';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"                element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox"           element={<Inbox />} />
            <Route path="/project/:id"     element={<ProjectDetail />} />
            <Route path="/runners"         element={<Runners />} />
            <Route path="/usage"           element={<Navigate to="/runners" replace />} />
            <Route path="/settings"        element={<Navigate to="/runners" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
