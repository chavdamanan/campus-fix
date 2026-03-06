import React from 'react';
import { getCurrentUser } from '../utils/storage';

export default function NotificationBell() {
    const [notifications, setNotifications] = React.useState([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const user = getCurrentUser();

    const fetchNotifications = React.useCallback(() => {
        if (!user || user.role === 'admin' || user.role === 'worker') return;

        fetch(`/api/issues?reporterEmail=${encodeURIComponent(user.email)}`)
            .then(res => res.json())
            .then(issues => {
                if (!Array.isArray(issues)) {
                    console.error('Invalid issues response:', issues);
                    return;
                }
                // Filter for resolved issues that haven't been notified
                const unread = issues.filter(i => i.status === 'Resolved' && i.userNotified === false);
                setNotifications(unread);
            })
            .catch(err => console.error('Failed to fetch notifications', err));
    }, [user]);

    React.useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const dismissNotification = async (e, id) => {
        e.stopPropagation();
        try {
            await fetch(`/api/issues/${id}/notify`, { method: 'PUT' });
            // Remove from local state
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error('Failed to dismiss notification', err);
        }
    };

    const toggleDropdown = () => {
        if (notifications.length > 0) {
            setIsOpen(!isOpen);
        }
    };

    // Close dropdown when clicking outside (simple implementation)
    React.useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [isOpen]);

    if (!user || user.role === 'admin' || user.role === 'worker') return null;

    return (
        <div className="notification-wrapper" onClick={e => e.stopPropagation()}>
            <button
                className={`notification-bell-btn ${notifications.length > 0 ? 'has-new' : ''}`}
                onClick={toggleDropdown}
                title={notifications.length > 0 ? `${notifications.length} Unread Notifications` : 'No New Notifications'}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length}</span>
                )}
            </button>

            {isOpen && notifications.length > 0 && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h4>Notifications</h4>
                        <span className="badge">{notifications.length} new</span>
                    </div>
                    <div className="notification-list">
                        {notifications.map(n => (
                            <div key={n._id} className="notification-item">
                                <div className="notif-icon-small">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="notif-content">
                                    <p className="notif-title">Issue Resolved</p>
                                    <p className="notif-desc">{n.category} at {n.location}</p>
                                </div>
                                <button
                                    className="notif-dismiss"
                                    onClick={(e) => dismissNotification(e, n._id)}
                                    title="Mark as Read"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
