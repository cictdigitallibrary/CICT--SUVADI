import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ClassicalTexts from './pages/ClassicalTexts';
import ManuscriptSearch from './pages/ManuscriptSearch';
import Team from './pages/Team';
import EBooks from './pages/EBooks';
import CriticalEditionNeed from './pages/CriticalEditionNeed';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import AdminPortal from './pages/AdminPortal';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/classical-texts" element={<ClassicalTexts />} />
              <Route path="/search" element={<ManuscriptSearch />} />
              <Route path="/team" element={<Team />} />
              <Route path="/ebooks" element={<EBooks />} />
              <Route path="/critical-editions/need" element={<CriticalEditionNeed />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/admin" element={<AdminPortal />} />
            </Routes>
          </Layout>
        </Router>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
