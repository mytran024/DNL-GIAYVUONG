import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UnifiedLogin from './components/UnifiedLogin';
import CSApp from './apps/cs/CSApp';
import InspectorApp from './apps/inspector/InspectorApp';
// Initialize Mock Backend (Seed data if empty) - REMOVED
// useEffect(() => {
//     MockBackend.init();
// }, []);

const App: React.FC = () => {
    const [userRole, setUserRole] = useState<'CS' | 'INSPECTOR' | 'ADMIN' | null>(() => {
        const saved = localStorage.getItem('danalog_auth');
        return saved ? JSON.parse(saved).role : null;
    });
    const [currentUser, setCurrentUser] = useState<any>(() => {
        const saved = localStorage.getItem('danalog_auth');
        return saved ? JSON.parse(saved).user : null;
    });

    // MockBackend init removed

    const handleLogin = (role: 'CS' | 'INSPECTOR' | 'ADMIN', user: any) => {
        setUserRole(role);
        setCurrentUser(user);
        localStorage.setItem('danalog_auth', JSON.stringify({ role, user }));
    };

    const handleLogout = () => {
        setUserRole(null);
        setCurrentUser(null);
        localStorage.removeItem('danalog_auth');
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        !userRole ? (
                            <UnifiedLogin onLogin={handleLogin} />
                        ) : (userRole === 'CS' || userRole === 'ADMIN') ? (
                            <Navigate to="/cs" replace />
                        ) : (
                            <Navigate to="/inspector" replace />
                        )
                    }
                />

                <Route
                    path="/cs/*"
                    element={
                        (userRole === 'CS' || userRole === 'ADMIN') ? (
                            <CSApp currentUser={currentUser} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                <Route
                    path="/inspector/*"
                    element={
                        userRole === 'INSPECTOR' ? (
                            <InspectorApp currentUser={currentUser} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
