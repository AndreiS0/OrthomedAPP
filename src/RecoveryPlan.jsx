import { useState, useEffect } from 'react';

export default function RecoveryPlan({ onBack, onComplete, currentDay, setCurrentDay }) {
    const [isCompleted, setIsCompleted] = useState(false);
    const totalDays = 5;

    useEffect(() => {
        if (currentDay > totalDays) {
            setIsCompleted(true);
        }
    }, [currentDay]);

    const handleMarkDone = () => {
        if (currentDay < totalDays) {
            setCurrentDay(currentDay + 1);
        } else {
            setIsCompleted(true);
        }
    };

    const handleRepeat = () => {
        setCurrentDay(1);
        setIsCompleted(false);
    };

    const handleFinishAndGoBack = () => {
        onComplete();
        onBack();
    };

    return (
        <div className="recovery-container gold-layout">
            <button className="btn-nav" onClick={onBack} style={{ marginBottom: '20px' }}>&lt; Back to Dashboard</button>

            <h2 className="recovery-main-title">Your Recovery Plan</h2>

            <div className="recovery-card animate-pop-in">

                {isCompleted ? (
                    <div className="completion-view animate-fade-up">
                        <div className="sparkle" style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
                        <h3 className="recovery-subtitle">Weekly Goal Reached!</h3>
                        <p style={{ color: '#6b7280', margin: '20px 0', fontSize: '1.1rem' }}>
                            Awesome job! You've successfully completed all {totalDays} days of your recovery exercises.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
                            <button className="btn-primary btn-full" onClick={handleRepeat}>
                                🔁 Yes, repeat exercises (Start Day 1)
                            </button>
                            <button className="btn-outline btn-full" onClick={handleFinishAndGoBack}>
                                ✅ No, go back to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-up">
                        <h3 className="recovery-subtitle">Knee Mobility - Day {currentDay}</h3>

                        <button className="video-btn" style={{ transition: 'all 0.3s' }}>
                            <span className="play-icon">▶</span> Watch Video for Day {currentDay}
                        </button>

                        <div className="goal-section">
                            <p className="goal-label">Weekly Goal</p>

                            <div className="progress-segments">
                                {[...Array(totalDays)].map((_, index) => (
                                    <div
                                        key={index}
                                        className={`segment ${index < currentDay ? 'active' : ''}`}
                                        style={{ transition: 'background-color 0.4s ease' }}
                                    ></div>
                                ))}
                            </div>

                            <p className="goal-count">{currentDay}/{totalDays} days completed</p>
                        </div>

                        <button
                            className="btn-primary btn-full mark-done"
                            onClick={handleMarkDone}
                            style={{ marginTop: '30px', transition: 'all 0.2s' }}
                        >
                            Mark Day {currentDay} exercise as done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}