import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useIsMobile } from './hooks/useIsMobile';
import Sidebar from './components/Sidebar';
import MobileShell from './components/mobile/MobileShell';
import Inbox from './pages/Inbox';
import ProjectDetail from './pages/ProjectDetail';
import Runners from './pages/Runners';
import Labels from './pages/Labels';
import MobileInbox from './pages/mobile/MobileInbox';
import MobileProjects from './pages/mobile/MobileProjects';
import MobileProjectDetail from './pages/mobile/MobileProjectDetail';
import MobileRunners from './pages/mobile/MobileRunners';
import MobileLabels from './pages/mobile/MobileLabels';

function DesktopShell() {
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
            <Route path="/labels" element={<Labels />} />
            <Route path="/projects" element={<Navigate to="/inbox" replace />} />
            <Route path="/usage" element={<Navigate to="/runners" replace />} />
            <Route path="/settings" element={<Navigate to="/runners" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function MobileApp() {
  const location = useLocation();

  return (
    <MobileShell>
      <div key={location.pathname} className="motion-page min-h-full">
        <Routes>
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<MobileInbox />} />
          <Route path="/projects" element={<MobileProjects />} />
          <Route path="/project/:id" element={<MobileProjectDetail />} />
          <Route path="/runners" element={<MobileRunners />} />
          <Route path="/labels" element={<MobileLabels />} />
          <Route path="/usage" element={<Navigate to="/runners" replace />} />
          <Route path="/settings" element={<Navigate to="/runners" replace />} />
        </Routes>
      </div>
    </MobileShell>
  );
}

export default function App() {
  const isMobile = useIsMobile();

  return (
    <BrowserRouter>
      {isMobile ? <MobileApp /> : <DesktopShell />}
    </BrowserRouter>
  );
}
