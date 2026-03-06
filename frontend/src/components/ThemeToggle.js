import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: theme === 'light' ? '#334155' : '#fbbf24', // Slate for Moon, Gold for Sun
                border: theme === 'light' ? '2px solid #1e293b' : '2px solid #f59e0b',
                borderRadius: '50%',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: theme === 'light'
                    ? '0 4px 12px rgba(15, 23, 42, 0.3)'
                    : '0 0 15px rgba(251, 191, 36, 0.6), 0 0 5px rgba(251, 191, 36, 0.8)',
                marginLeft: 12,
                transform: 'scale(1)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
            {theme === 'light' ? (
                // Moon Icon (White/Light inside Slate button)
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="#f8fafc"
                    stroke="#f8fafc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            ) : (
                // Sun Icon (White/Dark inside Gold button? Or just white rays?)
                // Let's use a darker amber/white sun inside the bright gold button for contrast
                <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            )}
        </button>
    );
}
