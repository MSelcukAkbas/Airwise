import React, { useState } from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const handleLogin = (token: string) => {
    setAdminToken(token);
    setIsAuthenticated(true);
    localStorage.setItem('adminToken', token);
  };

  const handleLogout = () => {
    setAdminToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('adminToken');
  };

  return (
    <div className="app">
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard token={adminToken || ''} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
