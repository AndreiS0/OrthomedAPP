import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function StatsView({ appointments }) {
    // Detectăm dacă suntem pe ecran mic (telefon)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const partCounts = appointments.reduce((acc, app) => {
        const part = app.part;
        acc[part] = (acc[part] || 0) + 1;
        return acc;
    }, {});

    const areaData = Object.keys(partCounts).map(key => ({
        name: key,
        value: partCounts[key]
    }));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthCounts = appointments.reduce((acc, app) => {
        if (app.date) {
            const monthIndex = parseInt(app.date.split('-')[1], 10) - 1;
            const monthName = monthNames[monthIndex];
            acc[monthName] = (acc[monthName] || 0) + 1;
        }
        return acc;
    }, {});

    // Adăugăm o sortare pentru ca lunile să apară în ordine cronologică
    const monthlyData = Object.keys(monthCounts)
        .map(key => ({ name: key, count: monthCounts[key] }))
        .sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

    const COLORS = ['#2e66ff', '#5b89ff', '#8caaff', '#bdccff', '#dee5ff', '#a5b4fc', '#c7d2fe'];

    // Funcție custom pentru a face Tooltip-ul de la BarChart mai puțin enervant pe mobil
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: 0, color: '#333', fontWeight: 'bold' }}>{label}</p>
                    <p style={{ margin: 0, color: '#2e66ff' }}>Appointments: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="gold-layout">
            <div className="stats-grid" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>

                {/* Pie Chart */}
                <div className="chart-card-large" style={{ width: '100%', marginBottom: isMobile ? '20px' : '0' }}>
                    <h3 style={{ textAlign: isMobile ? 'center' : 'left' }}>Most Common Affected Areas</h3>
                    {/* Dăm un container mai înalt pe mobil ca să aibă loc și cercul și legenda verticală */}
                    <ResponsiveContainer width="100%" height={isMobile ? 350 : 300}>
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Pie
                                data={areaData}
                                innerRadius={isMobile ? 40 : 60} // Cerc mai mic pe mobil
                                outerRadius={isMobile ? 80 : 100} // Cerc mai mic pe mobil
                                paddingAngle={2}
                                dataKey="value"
                                cx="50%"
                                cy={isMobile ? "40%" : "50%"} // Ridicăm puțin cercul pe mobil ca să facem loc legendei jos
                                label={!isMobile} // Ascundem etichetele alea dubioase cu săgeți pe mobil
                            >
                                {areaData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                                verticalAlign={isMobile ? "bottom" : "middle"}
                                align={isMobile ? "center" : "right"}
                                layout={isMobile ? "vertical" : "vertical"} // Pe mobil o forțăm verticală sub cerc
                                wrapperStyle={isMobile ? { paddingTop: '20px', fontSize: '12px' } : {}}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="chart-card-large" style={{ width: '100%' }}>
                    <h3 style={{ textAlign: isMobile ? 'center' : 'left' }}>Appointments per Month</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData} margin={isMobile ? { top: 10, right: 10, left: -25, bottom: 0 } : { top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8caaff', fontSize: isMobile ? 12 : 14 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8caaff', fontSize: isMobile ? 12 : 14 }}
                                allowDecimals={false}
                            />
                            {/* Folosim tooltip custom ca să arate curat pe mobil */}
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="count" fill="#2e66ff" radius={[10, 10, 0, 0]} barSize={isMobile ? 25 : 40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
}