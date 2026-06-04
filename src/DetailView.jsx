export default function DetailView({ appointment, onBack, onDelete, onEdit }) {
    return (
        <div className="detail-container">
            <button className="btn-back" onClick={onBack}>&lt; Back to Appointments</button>

            <div className="detail-card">
                <h2 className="detail-title">Appointment Details</h2>

                <div className="detail-group">
                    <label>Patient Name:</label>
                    <p>{appointment.name}</p>
                </div>

                <div className="detail-group">
                    <label>Date:</label>
                    <p>{appointment.date}</p>
                </div>

                <div className="detail-group">
                    <label>Affected Body Part:</label>
                    <p>{appointment.part}</p>
                </div>

                <div className="detail-group">
                    <label>Status:</label>
                    <p>{appointment.status}</p>
                </div>

                <div className="detail-group">
                    <label>Pain Description:</label>
                    <div className="pain-box">
                        Patient reports severe discomfort in the {appointment.part.toLowerCase()} area, especially during movement. Needs further medical evaluation.
                    </div>
                </div>

                <div className="detail-actions">
                    {}
                    <button className="btn-primary" onClick={onEdit}>Edit Appointment</button>
                    <button className="btn-outline" onClick={() => onDelete(appointment.id)}>Delete</button>
                </div>
            </div>
        </div>
    );
}