import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isAdmin  = location.pathname.startsWith('/admin');
  const isReader = location.pathname.includes('/read');

  const isHomePage = location.pathname === '/';
  
  // Navbar height: Solid un-scrolled = 124px
  const mainPadding = isAdmin || isReader ? '' : 'pt-[124px]';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && !isReader && <Navbar />}
      <main className={`flex-grow ${isAdmin ? 'h-screen overflow-hidden' : mainPadding}`}>
        {children}
      </main>
      {!isAdmin && !isReader && <Footer />}
    </div>
  );
};

export default Layout;
