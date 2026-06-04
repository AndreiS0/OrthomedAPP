import { useState, useEffect, useRef } from 'react';
import DetailView from './DetailView';
import AppointmentForm from './AppointmentForm';
import Cookies from 'js-cookie';
import StatsView from './StatsView';
import RecoveryPlan from './RecoveryPlan';
import ChatWidget from './ChatWidget';
import { io } from 'socket.io-client';
import { offlineManager } from './offlineManager';

import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
    uri: 'https://172.20.10.2:3000/graphql',
});


const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            ...headers,
            'x-username': localStorage.getItem('username') || 'Unknown',
            'x-user-role': localStorage.getItem('userRole') || 'Unknown',
            authorization: token ? `Bearer ${token}` : ''
        }
    };
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

const GET_APPOINTMENTS = gql`
    query GetAllAppointments {
        getAllAppointments { id date part status patient { id name } }
    }
`;

const GET_SUSPECTS = gql`
    query GetObservationList {
        getObservationList { id userId reason timestamp }
    }
`;

const ADD_PATIENT = gql`mutation AddPatient($name: String!) { addPatient(name: $name) { id } }`;
const ADD_APPOINTMENT = gql`mutation AddAppointment($patientId: ID!, $date: String!, $part: String!, $status: String) { addAppointment(patientId: $patientId, date: $date, part: $part, status: $status) { id date part status patient { id name } } }`;
const UPDATE_APPOINTMENT = gql`mutation UpdateAppointment($id: ID!, $date: String, $part: String, $status: String) { updateAppointment(id: $id, date: $date, part: $part, status: $status) { id date part status patient { id name } } }`;
const DELETE_APPOINTMENT = gql`mutation DeleteAppointment($id: ID!) { deleteAppointment(id: $id) }`;

export default function MasterView({ onLogout }) {
    const [allAppointments, setAllAppointments] = useState([]);
    const [visibleAppointments, setVisibleAppointments] = useState([]);
    const ITEMS_PER_LOAD = 15;
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingApp, setEditingApp] = useState(null);
    const [subView, setSubView] = useState('tabular');
    const [showRecovery, setShowRecovery] = useState(false);
    const [lastViewed, setLastViewed] = useState(null);
    const [isRecoveryDone, setIsRecoveryDone] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [isFakerRunning, setIsFakerRunning] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [suspects, setSuspects] = useState([]);

    const userRole = localStorage.getItem('userRole');


    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                alert("Session expired due to inactivity.");
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('userRole');
                onLogout();
            }, 60000);
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            clearTimeout(timeout);
        };
    }, [onLogout]);

    const fetchGraphQLData = async () => {
        try {
            const { data } = await client.query({
                query: GET_APPOINTMENTS,
                fetchPolicy: 'network-only'
            });
            const formatted = data.getAllAppointments.map(app => ({
                id: app.id, name: app.patient.name, date: app.date, part: app.part, status: app.status
            }));
            setAllAppointments(formatted);
            setVisibleAppointments(formatted.slice(0, ITEMS_PER_LOAD));
        } catch (err) {
            console.error("GraphQL Error:", err);
        }
    };

    const fetchSuspects = async () => {
        try {
            const { data } = await client.query({
                query: GET_SUSPECTS,
                fetchPolicy: 'network-only'
            });
            setSuspects(data.getObservationList);
            setShowAdminPanel(true);
        } catch (err) { console.error("Admin Error:", err); }
    };

    useEffect(() => {
        fetchGraphQLData();
        const savedName = Cookies.get('lastViewedPatient');
        if (savedName) setLastViewed(savedName);

        const handleOnline = async () => { setIsOffline(false); await offlineManager.syncWithServer(); fetchGraphQLData(); };
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);

    useEffect(() => {
        const socket = io('https://172.20.10.2:3000');
        socket.on('new-appointment', fetchGraphQLData);
        return () => socket.disconnect();
    }, []);

    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 10) {
            if (visibleAppointments.length < allAppointments.length) {
                setIsLoadingMore(true);
                setTimeout(() => {
                    const nextItems = allAppointments.slice(0, visibleAppointments.length + ITEMS_PER_LOAD);
                    setVisibleAppointments(nextItems);
                    setIsLoadingMore(false);
                }, 800);
            }
        }
    };

    const toggleFaker = async () => {
        if (isOffline) return alert("Cannot use faker while offline");
        const endpoint = isFakerRunning ? '/api/faker/stop' : '/api/faker/start';
        try {
            await fetch(`https://172.20.10.2:3000${endpoint}`, { method: 'POST' });
            setIsFakerRunning(!isFakerRunning);
        } catch (error) { console.error("Error:", error); }
    };

    const handleSignOut = () => { if (window.confirm("Are you sure you want to sign out?")) onLogout(); };

    const handleSave = async (appData) => {
        if (editingApp) {
            if (isOffline) {
                offlineManager.addToQueue('PUT', appData);
                const updated = allAppointments.map(app => app.id === appData.id ? appData : app);
                setAllAppointments(updated); setVisibleAppointments(updated.slice(0, visibleAppointments.length));
            } else {
                try {
                    await client.mutate({
                        mutation: UPDATE_APPOINTMENT,
                        variables: { id: appData.id, date: appData.date, part: appData.part, status: appData.status }
                    });
                    fetchGraphQLData();
                } catch (error) { console.error(error); }
            }
        } else {
            if (isOffline) {
                if (!appData.id) appData.id = "temp-" + Date.now();
                offlineManager.addToQueue('POST', appData);
                const newAll = [...allAppointments, appData];
                setAllAppointments(newAll); setVisibleAppointments(newAll.slice(0, Math.max(visibleAppointments.length, ITEMS_PER_LOAD)));
            } else {
                try {
                    const { data: patientData } = await client.mutate({ mutation: ADD_PATIENT, variables: { name: appData.name } });
                    await client.mutate({ mutation: ADD_APPOINTMENT, variables: { patientId: patientData.addPatient.id, date: appData.date, part: appData.part, status: appData.status } });
                    fetchGraphQLData();
                } catch (error) { console.error(error); }
            }
        }
        setIsFormOpen(false); setEditingApp(null); setSelectedApp(null);
    };

    const handleDelete = async (id) => {
        const performDeleteLocal = () => {
            const updated = allAppointments.filter(app => app.id !== id);
            setAllAppointments(updated); setVisibleAppointments(updated.slice(0, visibleAppointments.length));
            setSelectedApp(null);
        };
        if (isOffline) { offlineManager.addToQueue('DELETE', { id }); performDeleteLocal(); }
        else {
            try {
                await client.mutate({ mutation: DELETE_APPOINTMENT, variables: { id } });
                performDeleteLocal();
            } catch (error) { console.error(error); }
        }
    };

    const handleViewDetails = (app) => { setSelectedApp(app); Cookies.set('lastViewedPatient', app.name, { expires: 7 }); setLastViewed(app.name); };

    if (showRecovery) return <RecoveryPlan onBack={() => setShowRecovery(false)} onComplete={() => setIsRecoveryDone(true)} currentDay={currentDay} setCurrentDay={setCurrentDay} />;
    if (isFormOpen || editingApp) return <AppointmentForm appointment={editingApp} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingApp(null); }} />;
    if (selectedApp) return <DetailView appointment={selectedApp} onBack={() => setSelectedApp(null)} onDelete={handleDelete} onEdit={() => setEditingApp(selectedApp)} />;

    if (showAdminPanel) {
        return (
            <div className="master-container gold-layout">
                <div className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fee2e2', padding: '15px', borderRadius: '8px' }}>
                    <h2 style={{ color: '#991b1b', margin: 0 }}>🛡️ Security Observation List</h2>
                    <button className="btn-primary" onClick={() => setShowAdminPanel(false)}>Back to Dashboard</button>
                </div>
                <div className="table-card" style={{ marginTop: '20px', width: '100%', overflow: 'hidden' }}>

                    {/* ADMIN TABLE FORCED WIDTH */}
                    <table className="appointments-table" style={{ width: '100%', minWidth: '100%', display: 'table', tableLayout: 'fixed', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#fca5a5' }}>
                        <tr>
                            <th style={{ width: '40%', padding: '12px' }}>Suspect User</th>
                            <th style={{ width: '40%', padding: '12px' }}>Reason</th>
                            <th style={{ width: '20%', padding: '12px' }}>Date & Time</th>
                        </tr>
                        </thead>
                        <tbody>
                        {suspects.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No suspicious activity detected.</td></tr>
                        ) : suspects.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                                <td style={{ fontWeight: 'bold', color: '#b91c1c', padding: '12px', wordWrap: 'break-word' }}>{s.userId}</td>
                                <td style={{ padding: '12px', wordWrap: 'break-word' }}>{s.reason}</td>
                                <td style={{ padding: '12px' }}>{new Date(parseInt(s.timestamp)).toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="master-container gold-layout">
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '10px', gap: '10px' }}>
                {userRole === 'Admin' && (
                    <button onClick={fetchSuspects} className="btn-outline" style={{ margin: 0, borderColor: '#ef4444', color: '#ef4444' }}>
                        🛡️ Admin Panel
                    </button>
                )}
                <button onClick={handleSignOut} className="btn-logout" title="Sign Out" style={{ margin: 0 }}>
                    <span>Sign Out</span>
                </button>
            </div>

            {isOffline && <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px', textAlign: 'center', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold' }}>⚠️ You are currently offline. Changes will be saved locally.</div>}
            {lastViewed && <div className="activity-banner"><span className="sparkle">✨</span> Welcome back! You recently viewed: <strong>{lastViewed}</strong></div>}

            <div className="view-toggle">
                <button className={subView === 'tabular' ? 'active' : ''} onClick={() => setSubView('tabular')}> Tabular View </button>
                <button className={subView === 'visual' ? 'active' : ''} onClick={() => setSubView('visual')}> Visual View </button>
            </div>

            <div className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-title" style={{ minWidth: 'max-content' }}>
                    <svg className="header-logo" viewBox="0 0 24 24" fill="none" stroke="#2e66ff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    <h2>{subView === 'tabular' ? 'Appointments' : 'Statistics'}</h2>
                </div>

                <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                    {userRole !== 'Patient' && (
                        <button onClick={toggleFaker} style={{ backgroundColor: isFakerRunning ? '#ef4444' : (isOffline ? '#9ca3af' : '#3b82f6'), color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: isOffline ? 'not-allowed' : 'pointer', transition: '0.3s', whiteSpace: 'nowrap' }} disabled={isOffline}>
                            {isFakerRunning ? '🛑 Stop Faker' : '🤖 Start Faker'}
                        </button>
                    )}
                    {isRecoveryDone && <div className="animate-pop-in" style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '8px 15px', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}><span>🏆</span> Goal Reached</div>}
                    <button className="btn-outline" onClick={() => !isRecoveryDone && setShowRecovery(true)} disabled={isRecoveryDone} style={{ cursor: isRecoveryDone ? 'not-allowed' : 'pointer', opacity: isRecoveryDone ? 0.6 : 1, borderColor: isRecoveryDone ? '#166534' : '#2e66ff', color: isRecoveryDone ? '#166534' : '#2e66ff', whiteSpace: 'nowrap' }}>
                        {isRecoveryDone ? '✅ Exercises Finished' : 'My Recovery'}
                    </button>
                    <button className="btn-primary btn-rect" onClick={() => setIsFormOpen(true)} style={{ whiteSpace: 'nowrap' }}>+ New Appointment</button>
                </div>
            </div>

            {subView === 'tabular' ? (
                <div className="table-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <div onScroll={handleScroll} style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #eee', width: '100%' }}>

                        {/* MAIN TABLE FORCED WIDTH */}
                        <table className="appointments-table" style={{ width: '100%', minWidth: '100%', display: 'table', tableLayout: 'fixed', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <tr>
                                <th style={{ width: '25%', padding: '15px 10px', borderBottom: '2px solid #eee' }}>Patient Name</th>
                                <th style={{ width: '20%', padding: '15px 10px', borderBottom: '2px solid #eee' }}>Date</th>
                                <th style={{ width: '25%', padding: '15px 10px', borderBottom: '2px solid #eee' }}>Affected Bone/Body Part</th>
                                <th style={{ width: '15%', padding: '15px 10px', borderBottom: '2px solid #eee' }}>Status</th>
                                <th style={{ width: '15%', padding: '15px 10px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {visibleAppointments.map(app => (
                                <tr key={app.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px 10px', wordWrap: 'break-word' }}>{app.name}</td>
                                    <td style={{ padding: '12px 10px' }}>{app.date}</td>
                                    <td style={{ padding: '12px 10px', wordWrap: 'break-word' }}>{app.part}</td>
                                    <td style={{ padding: '12px 10px' }}><span className={`status-pill ${app.status.toLowerCase()}`}>{app.status}</span></td>
                                    <td className="actions-cell" style={{ padding: '12px 10px', textAlign: 'right' }}>
                                        {userRole !== 'Patient' ? (
                                            <>
                                                <button className="btn-icon" title="View Details" onClick={() => handleViewDetails(app)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2e66ff" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                                                <button className="btn-icon" title="Delete" onClick={() => handleDelete(app.id)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2e66ff" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>Read-only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {isLoadingMore && <div style={{ textAlign: 'center', padding: '20px', color: '#2e66ff', fontWeight: 'bold' }}>⏳ Loading more patients...</div>}
                    </div>
                </div>
            ) : (
                <StatsView appointments={allAppointments} />
            )}

            <ChatWidget />
        </div>
    );
}