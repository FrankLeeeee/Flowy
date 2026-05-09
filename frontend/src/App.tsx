import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useIsMobile } from "./hooks/useIsMobile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import CreateTaskModal from "./components/tasks/CreateTaskModal";
import MobileShell from "./components/mobile/MobileShell";
import Inbox from "./pages/Inbox";
import ListDetail from "./pages/ListDetail";
import Runners from "./pages/Runners";
import Labels from "./pages/Labels";
import Skills from "./pages/Skills";
import Sessions from "./pages/Sessions";
import MobileHome from "./pages/mobile/MobileHome";
import MobileInbox from "./pages/mobile/MobileInbox";
import MobileLists from "./pages/mobile/MobileLists";
import MobileListDetail from "./pages/mobile/MobileListDetail";
import MobileLabels from "./pages/mobile/MobileLabels";
import Stats from "./pages/Stats";
import MobileStats from "./pages/mobile/MobileStats";
import TodoView from "./pages/TodoView";
import ScheduledTasksView from "./pages/ScheduledTasksView";
import { fetchLists, createTask } from "./api/client";
import { List } from "./types";
import OfflineBanner from "./components/OfflineBanner";

function DesktopShell() {
  const location = useLocation();
  const [showGlobalCreate, setShowGlobalCreate] = useState(false);
  const [globalLists, setGlobalLists] = useState<List[]>([]);

  useEffect(() => {
    const handler = () => {
      fetchLists().then(setGlobalLists).catch(() => {});
      setShowGlobalCreate(true);
    };
    window.addEventListener('flowy:create-task', handler);
    return () => window.removeEventListener('flowy:create-task', handler);
  }, []);

  const handleGlobalCreateTask = useCallback(
    async (data: Parameters<typeof createTask>[0]) => {
      await createTask(data);
      setShowGlobalCreate(false);
    },
    [],
  );

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <OfflineBanner />
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div key={location.pathname} className="motion-page h-full">
            <Routes>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<ScheduledTasksView mode="today" />} />
              <Route path="/this-week" element={<ScheduledTasksView mode="week" />} />
              <Route path="/all" element={<ScheduledTasksView mode="all" />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/list/:id" element={<ListDetail />} />
              <Route path="/runners" element={<Runners />} />
              <Route path="/labels" element={<Labels />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/todos" element={<TodoView />} />
              <Route
                path="/lists"
                element={<Navigate to="/inbox" replace />}
              />
              <Route path="/usage" element={<Navigate to="/runners" replace />} />
              <Route
                path="/settings"
                element={<Navigate to="/runners" replace />}
              />
            </Routes>
          </div>
        </main>
        <CommandPalette />
        <CreateTaskModal
          open={showGlobalCreate}
          lists={globalLists}
          onSubmit={handleGlobalCreateTask}
          onClose={() => setShowGlobalCreate(false)}
        />
      </div>
    </div>
  );
}

function MobileApp() {
  return (
    <MobileShell>
      {({ selectedDate }) => (
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<MobileHome selectedDate={selectedDate} />} />
          <Route path="/inbox" element={<MobileInbox />} />
          <Route path="/lists" element={<MobileLists />} />
          <Route path="/list/:id" element={<MobileListDetail />} />
          <Route path="/labels" element={<MobileLabels />} />
          <Route path="/stats" element={<MobileStats />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      )}
    </MobileShell>
  );
}

function AuthGuard() {
  const { status } = useAuth();
  const isMobile = useIsMobile();

  if (status === 'loading') return null;
  if (status === 'setup' || status === 'unauthenticated') return <LoginPage />;
  return isMobile ? <MobileApp /> : <DesktopShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </BrowserRouter>
  );
}
