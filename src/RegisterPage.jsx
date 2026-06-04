import { useState } from 'react';

export default function RegisterPage({ onRegister, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [roleName, setRoleName] = useState('Patient'); // Default e Patient
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match!");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('https://172.20.10.2:3000/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation Register($username: String!, $email: String!, $password: String!, $roleName: String!) {
                            register(username: $username, email: $email, password: $password, roleName: $roleName) { id }
                        }
                    `,
                    variables: { username, email, password, roleName }
                })
            });
            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            alert('Account created! You can login now.');
            onRegister();

        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="logo-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2e66ff" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
            </div>
            <h1 className="auth-title">Join OrthoMed</h1>

            <div className="auth-card animate-pop-in">
                <form onSubmit={handleSubmit}>

                    {errorMessage && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="name@gmail.com or @yahoo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>I am a:</label>
                        <select value={roleName} onChange={(e) => setRoleName(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', backgroundColor: '#f9fafb', fontSize: '1rem', color: '#374151', cursor: 'pointer' }}>
                            <option value="Patient">Patient </option>
                            <option value="Doctor">Doctor </option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>

                    <button type="submit" className="btn-primary btn-full" disabled={loading} style={{ marginTop: '10px' }}>
                        {loading ? 'Creating account...' : 'Register'}
                    </button>
                </form>
                <p className="auth-link">Already a member? <span onClick={onSwitchToLogin}>Login</span></p>
            </div>
        </div>
    );
}