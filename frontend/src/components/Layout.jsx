import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className={`flex-grow ${isAdmin ? 'h-screen overflow-hidden' : ''}`}>
        {children}
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
};

export default Layout;
