import { useState } from 'react';

export default function LoginPage({ onLogin, onSwitchToRegister }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [step, setStep] = useState('LOGIN');

    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [emailForReset, setEmailForReset] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            const response = await fetch('https://orthomedapp.onrender.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation Login($identifier: String!, $password: String!) {
                            login(identifier: $identifier, password: $password) { 
                                username 
                                requires2FA
                                token
                                role { name }
                            }
                        }
                    `,
                    variables: { identifier, password }
                })
            });

            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);

            const data = result.data.login;

            if (data.requires2FA) {
                setSuccessMessage("Code sent! Please check your email.");
                setStep('2FA');
            } else {
                // Dacă nu cere 2FA, salvăm datele și intrăm direct în aplicație
                localStorage.setItem('username', data.username);
                localStorage.setItem('userRole', data.role?.name || 'User');
                localStorage.setItem('token', data.token);
                onLogin(data);
            }
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            const response = await fetch('https://orthomedapp.onrender.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation Verify2FA($username: String!, $code: String!) {
                            verify2FA(username: $username, code: $code) { 
                                username 
                                role { name }
                                token
                            }
                        }
                    `,
                    variables: { username: identifier, code }
                })
            });

            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);

            const data = result.data.verify2FA;
            localStorage.setItem('username', data.username);
            localStorage.setItem('userRole', data.role.name);
            localStorage.setItem('token', data.token);
            onLogin(data);

        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            const response = await fetch('https://orthomedapp.onrender.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation ForgotPassword($email: String!) { forgotPassword(email: $email) }`,
                    variables: { email: emailForReset }
                })
            });
            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);

            setSuccessMessage("If the email exists, a reset code was sent!");
            setStep('RESET_PASS');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        try {
            const response = await fetch('https://orthomedapp.onrender.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation ResetPassword($email: String!, $code: String!, $newPassword: String!) { resetPassword(email: $email, code: $code, newPassword: $newPassword) }`,
                    variables: { email: emailForReset, code, newPassword }
                })
            });
            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);

            alert("Password reset successfully! You can now log in.");
            setStep('LOGIN');
            setCode('');
            setNewPassword('');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '20px' }}>

            {/* Logo & Branding la fel ca la Register */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2e66ff" strokeWidth="2" style={{ width: '60px', height: '60px', marginBottom: '10px' }}>
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <h1 style={{ color: '#2e66ff', margin: 0, fontSize: '2rem' }}>Welcome Back</h1>
            </div>

            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>

                {errorMessage && <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>⚠️ {errorMessage}</div>}
                {successMessage && <div style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>✅ {successMessage}</div>}

                {step === 'LOGIN' && (
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Username or Email</label>
                            <input type="text" placeholder="Enter your username" value={identifier} onChange={e => setIdentifier(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Password</label>
                            <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
                            <button type="button" onClick={() => {setStep('FORGOT_PASS'); setErrorMessage(''); setSuccessMessage('');}} style={{ background: 'none', border: 'none', color: '#2e66ff', cursor: 'pointer', fontSize: '0.85rem' }}>Forgot Password?</button>
                        </div>

                        <button type="submit" style={{ backgroundColor: '#2e66ff', color: 'white', padding: '14px', borderRadius: '25px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', width: '100%' }}>
                            Sign In
                        </button>

                        <div style={{ textAlign: 'left', marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                            Don't have an account?{' '}
                            <button type="button" onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', color: '#2e66ff', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>Sign up</button>
                        </div>
                    </form>
                )}

                {step === '2FA' && (
                    <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Security Code</label>
                            <input type="text" placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#2e66ff', color: 'white', padding: '14px', borderRadius: '25px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Verify & Login</button>
                        <button type="button" onClick={() => setStep('LOGIN')} style={{ background: 'none', color: '#666', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    </form>
                )}

                {step === 'FORGOT_PASS' && (
                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Account Email</label>
                            <input type="email" placeholder="Your Email Address" value={emailForReset} onChange={e => setEmailForReset(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#2e66ff', color: 'white', padding: '14px', borderRadius: '25px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Send Recovery Code</button>
                        <button type="button" onClick={() => setStep('LOGIN')} style={{ background: 'none', color: '#666', border: 'none', cursor: 'pointer' }}>Back to Login</button>
                    </form>
                )}

                {step === 'RESET_PASS' && (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>Recovery Code</label>
                            <input type="text" placeholder="6-digit code from email" value={code} onChange={e => setCode(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>New Password</label>
                            <input type="password" placeholder="Enter New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#2e66ff', color: 'white', padding: '14px', borderRadius: '25px', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Save New Password</button>
                    </form>
                )}
            </div>
        </div>
    );
}