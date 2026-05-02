import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useIsMobile } from "./hooks/useIsMobile";
import Sidebar from "./components/Sidebar";
import MobileShell from "./components/mobile/MobileShell";
import Inbox from "./pages/Inbox";
import ListDetail from "./pages/ListDetail";
import Runners from "./pages/Runners";
import Labels from "./pages/Labels";
import Skills from "./pages/Skills";
import Sessions from "./pages/Sessions";
import MobileSessions from "./pages/mobile/MobileSessions";
import MobileInbox from "./pages/mobile/MobileInbox";
import MobileLists from "./pages/mobile/MobileLists";
import MobileListDetail from "./pages/mobile/MobileListDetail";
import MobileRunners from "./pages/mobile/MobileRunners";
import MobileLabels from "./pages/mobile/MobileLabels";
import MobileSkills from "./pages/mobile/MobileSkills";
import Stats from "./pages/Stats";
import MobileStats from "./pages/mobile/MobileStats";
import MobileSettings from "./pages/mobile/MobileSettings";
import TodoView from "./pages/TodoView";
import ScheduledTasksView from "./pages/ScheduledTasksView";

function DesktopShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <div key={location.pathname} className="motion-page min-h-screen">
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
    </div>
  );
}

function MobileApp() {
  const location = useLocation();

  return (
    <MobileShell>
      <div key={location.pathname} className="motion-page min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<ScheduledTasksView mode="today" />} />
          <Route path="/this-week" element={<ScheduledTasksView mode="week" />} />
          <Route path="/all" element={<ScheduledTasksView mode="all" />} />
          <Route path="/inbox" element={<MobileInbox />} />
          <Route path="/lists" element={<MobileLists />} />
          <Route path="/list/:id" element={<MobileListDetail />} />
          <Route path="/runners" element={<MobileRunners />} />
          <Route path="/labels" element={<MobileLabels />} />
          <Route path="/skills" element={<MobileSkills />} />
          <Route path="/stats" element={<MobileStats />} />
          <Route path="/sessions" element={<MobileSessions />} />
          <Route path="/todos" element={<TodoView />} />
          <Route path="/usage" element={<Navigate to="/runners" replace />} />
          <Route path="/settings" element={<MobileSettings />} />
        </Routes>
      </div>
    </MobileShell>
  );
}

export default function App() {
  const isMobile = useIsMobile();

  return (
    <BrowserRouter>{isMobile ? <MobileApp /> : <DesktopShell />}</BrowserRouter>
  );
}
