import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './0005_Lib/supabaseClient';
import MainLayout from './0002_Components/02_Layout/MainLayout';
import Auth from './0004_Features/001_Auth/Auth';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<Auth />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          /* MainLayout이 내부에서 알아서 페이지를 바꿉니다. */
          <Route path="/*" element={<MainLayout session={session} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;