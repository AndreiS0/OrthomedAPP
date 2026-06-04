import { useState, useEffect } from 'react'
import './App.css'
import MasterView from './MasterView'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'

function App() {
    // 1. Când aplicația pornește, verificăm dacă există un user salvat în browser
    // 1. Când aplicația pornește, verificăm dacă există un TOKEN salvat, nu doar un nume
    const [currentView, setCurrentView] = useState(() => {
        const token = localStorage.getItem('token');
        // Dacă avem token-ul de securitate, mergem in aplicație. Dacă nu, la ecranul de start.
        return token ? 'master' : 'landing';
    });

    // 2. Funcția de Logout care șterge datele și te întoarce la ecranul de start
    const handleLogout = () => {
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('token'); // <--- ASTA LIPSEA AICI!
        setCurrentView('landing');
    };

    if (currentView === 'login') {
        return <LoginPage
            onLogin={() => setCurrentView('master')}
            onSwitchToRegister={() => setCurrentView('register')}
        />;
    }

    if (currentView === 'register') {
        return <RegisterPage
            onRegister={() => setCurrentView('login')}
            onSwitchToLogin={() => setCurrentView('login')}
        />;
    }

    if (currentView === 'master') {
        // Folosim noua funcție de logout aici
        return <MasterView onLogout={handleLogout} />;
    }

    return (
        <div className="welcome-container">
            <div className="logo animate-fade-up">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2e66ff" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
            </div>
            <h1 className="brand-name animate-fade-up delay-1">OrthoMed</h1>
            <p className="tagline animate-fade-up delay-2">Regain your mobility, step by step</p>
            <p className="description animate-fade-up delay-3">
                Book your appointments with expert orthopedic specialists for bone fractures and injuries.
                Get personalized treatment plans and track your recovery progress.
            </p>

            <div className="button-group animate-fade-up delay-4">
                <button className="btn-primary" onClick={() => setCurrentView('login')}>Log In</button>
                <button className="btn-outline" onClick={() => setCurrentView('register')}>Register</button>
            </div>
        </div>
    )
}

export default App