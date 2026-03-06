import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Step 1: Send OTP
    async function handleSendOtp(e) {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep(2);
                setMessage('OTP sent to your email.');
            } else {
                alert(data.message || 'Error sending OTP');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        } finally {
            setLoading(false);
        }
    }

    // Step 2: Verify OTP
    async function handleVerifyOtp(e) {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep(3);
                setMessage('OTP verified. Enter new password.');
            } else {
                alert(data.message || 'Invalid OTP');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        } finally {
            setLoading(false);
        }
    }

    // Step 3: Reset Password
    async function handleResetPassword(e) {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                alert('Password reset successfully! Please login with your new password.');
                navigate('/login');
            } else {
                alert(data.message || 'Error resetting password');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 520, margin: '30px auto' }}>
            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                    <div className="brand-logo-large" style={{ width: 56, height: 56, margin: 'auto' }} />
                    <h2 style={{ marginTop: 8 }}>Reset Password</h2>
                    <div style={{ color: 'var(--muted)' }}>
                        {step === 1 && 'Enter your email to receive an OTP'}
                        {step === 2 && 'Enter the OTP sent to your email'}
                        {step === 3 && 'Enter your new password'}
                    </div>
                </div>

                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <div>
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                        <div style={{ marginTop: 14, textAlign: 'center' }}>
                            <button type="submit" className="btn large" disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp}>
                        <div>
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                placeholder="123456"
                                required
                            />
                        </div>
                        <div style={{ marginTop: 14, textAlign: 'center' }}>
                            <button type="submit" className="btn large" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 10 }}>
                            <button type="button" className="btn small outline" onClick={() => setStep(1)} disabled={loading}>
                                Back to Email
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div>
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div style={{ marginTop: 14, textAlign: 'center' }}>
                            <button type="submit" className="btn large" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                )}

                {message && <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--primary)' }}>{message}</div>}

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <a href="/login" className="btn small outline" style={{ border: 'none' }}>Back to Login</a>
                </div>
            </div>
        </div>
    );
}
