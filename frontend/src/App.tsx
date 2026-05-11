import { useState, useEffect, useCallback, lazy, Suspense } from "react";
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
import ScheduledTasksView from "./pages/ScheduledTasksView";
import { fetchLists, createTask } from "./api/client";
import { List } from "./types";
import OfflineBanner from "./components/OfflineBanner";

const Inbox = lazy(() => import("./pages/Inbox"));
const ListDetail = lazy(() => import("./pages/ListDetail"));
const Runners = lazy(() => import("./pages/Runners"));
const Labels = lazy(() => import("./pages/Labels"));
const Skills = lazy(() => import("./pages/Skills"));
const Templates = lazy(() => import("./pages/Templates"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Stats = lazy(() => import("./pages/Stats"));
const TodoView = lazy(() => import("./pages/TodoView"));
const Settings = lazy(() => import("./pages/Settings"));

const MobileHome = lazy(() => import("./pages/mobile/MobileHome"));
const MobileInbox = lazy(() => import("./pages/mobile/MobileInbox"));
const MobileLists = lazy(() => import("./pages/mobile/MobileLists"));
const MobileListDetail = lazy(() => import("./pages/mobile/MobileListDetail"));
const MobileLabels = lazy(() => import("./pages/mobile/MobileLabels"));
const MobileStats = lazy(() => import("./pages/mobile/MobileStats"));
const MobileSettings = lazy(() => import("./pages/mobile/MobileSettings"));

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
            <Suspense>
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
                <Route path="/templates" element={<Templates />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/todos" element={<TodoView />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/lists"
                  element={<Navigate to="/inbox" replace />}
                />
                <Route path="/usage" element={<Navigate to="/runners" replace />} />
              </Routes>
            </Suspense>
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
        <Suspense>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<MobileHome selectedDate={selectedDate} />} />
            <Route path="/inbox" element={<MobileInbox />} />
            <Route path="/lists" element={<MobileLists />} />
            <Route path="/list/:id" element={<MobileListDetail />} />
            <Route path="/labels" element={<MobileLabels />} />
            <Route path="/stats" element={<MobileStats />} />
            <Route path="/settings" element={<MobileSettings />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </Suspense>
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
