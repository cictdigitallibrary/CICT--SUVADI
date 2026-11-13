import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ClassicalTexts from './pages/ClassicalTexts';
import ClassicalTextsList from './pages/ClassicalTextsList';
import ManuscriptSearch from './pages/ManuscriptSearch';
import Team from './pages/Team';
import EBooks from './pages/EBooks';
import EBookDetail from './pages/EBookDetail';
import CriticalEditionNeed from './pages/CriticalEditionNeed';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import Publication from './pages/Publication';

// Loaded on demand: the PDF reader (react-pdf / PDF.js / page-flip) and the admin
// portal are large and not needed to render the public pages.
// The server refuses requests over its per-visitor limit (403, see utils/imageRetry.js);
// a refused script or stylesheet would leave the reader stuck on its loading screen,
// so the import is tried again a few times before giving up.
const retryImport = (load, delays = [500, 1500, 3000, 6000]) => load().catch(err =>
  delays.length ? new Promise(r => setTimeout(r, delays[0])).then(() => retryImport(load, delays.slice(1))) : Promise.reject(err));
const FlipbookReader = lazy(() => retryImport(() => import('./pages/FlipbookReader')));
const AdminPortal = lazy(() => retryImport(() => import('./pages/AdminPortal')));

// Library data changes rarely: reuse fetched lists across page visits instead of
// re-requesting them on every navigation and window focus.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <Layout>
            <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/classical-texts" element={<ClassicalTexts />} />
              <Route path="/classical-texts-list" element={<ClassicalTextsList />} />
              <Route path="/search" element={<ManuscriptSearch />} />
              <Route path="/team" element={<Team />} />
              <Route path="/ebooks" element={<EBooks />} />
              <Route path="/ebooks/:id" element={<EBookDetail />} />
              <Route path="/ebooks/:id/read" element={<FlipbookReader />} />
              <Route path="/critical-editions/need" element={<CriticalEditionNeed />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/publication/:id" element={<Publication />} />
            </Routes>
            </Suspense>
          </Layout>
        </Router>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
