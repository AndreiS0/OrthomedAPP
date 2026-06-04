import { useState } from 'react';

export default function AppointmentForm({ appointment, onSave, onCancel }) {
    const [name, setName] = useState(appointment ? appointment.name : '');
    const [date, setDate] = useState(appointment ? appointment.date : '');
    const [part, setPart] = useState(appointment ? appointment.part : '');
    const [status, setStatus] = useState(appointment ? appointment.status : 'Pending');
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        const today = new Date().toISOString().split('T')[0];


        if (name.trim().length < 3) {
            newErrors.name = "Patient name must be at least 3 characters long.";
        } else if (/\d/.test(name)) {
            newErrors.name = "Name should not contain numbers.";
        }

        if (!date) {
            newErrors.date = "Please select a date.";
        } else if (date < today) {
            newErrors.date = "Appointments cannot be set in the past.";
        }

        if (part.trim().length < 2) {
            newErrors.part = "Please specify a valid body part (e.g., Knee, Arm).";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            const appData = {
                id: appointment ? appointment.id : Date.now(),
                name,
                date,
                part,
                status
            };
            onSave(appData);
        }
    };

    return (
        <div className="form-container">
            <button className="btn-back" onClick={onCancel}>&lt; Back to Appointments</button>

            <div className="form-card">
                <h2 className="form-title">{appointment ? 'Edit Appointment' : 'New Appointment'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Patient Name *</label>
                        <input
                            type="text"
                            className={errors.name ? 'input-error' : ''}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label>Date *</label>
                        <input
                            type="date"
                            className={errors.date ? 'input-error' : ''}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                        {errors.date && <span className="error-text">{errors.date}</span>}
                    </div>

                    <div className="form-group">
                        <label>Affected Bone/Body Part *</label>
                        <input
                            type="text"
                            className={errors.part ? 'input-error' : ''}
                            value={part}
                            onChange={e => setPart(e.target.value)}
                        />
                        {errors.part && <span className="error-text">{errors.part}</span>}
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">Save Appointment</button>
                        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}