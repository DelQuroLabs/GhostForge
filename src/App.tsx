import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Flame, LayoutDashboard, Sparkles, Terminal, Fingerprint, Bot, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './pages/Dashboard.js';
import NewBook from './pages/NewBook.js';
import BookWorkspace from './pages/BookWorkspace.js';
import ChapterReader from './pages/ChapterReader.js';
import Brands from './pages/Brands.js';
import AiStudio from './pages/AiStudio.js';
import AgentPack from './pages/AgentPack.js';
import ImportBook from './pages/ImportBook.js';
import Settings from './pages/Settings.js';
import ErrorBoundary from './components/ErrorBoundary.js';

function Shell() {
  return (
    <div className="shell">
      <aside className="side">
        <NavLink to="/" className="brand">
          <span className="brand-mark"><Flame size={20} /></span>
          <span className="brand-name">Ghostforge<small>faceless book studio</small></span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={17} /> Shelf
          </NavLink>
          <NavLink to="/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Sparkles size={17} /> Forge a Book
          </NavLink>
          <NavLink to="/agent-pack" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Terminal size={17} /> Agent Pack
          </NavLink>
          <NavLink to="/brands" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Fingerprint size={17} /> Pen Names
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Bot size={17} /> AI Studio
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={17} /> Settings & AI
          </NavLink>
        </nav>
        <div className="side-foot">Full books, not paragraphs.<br />Offline engine works offline.</div>
      </aside>
      <main className="main">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewBook />} />
          <Route path="/agent-pack" element={<AgentPack />} />
          <Route path="/books/:id" element={<BookWorkspace />} />
          <Route path="/books/:id/import" element={<ImportBook />} />
          <Route path="/read/:chId" element={<ChapterReader />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/ai" element={<AiStudio />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="empty"><div className="empty-title">Lost in the stacks?</div><p>That page doesn&apos;t exist — pick a destination on the left.</p></div>} />
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
