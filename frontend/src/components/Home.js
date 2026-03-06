import React from 'react';


const ICONS = [
  { key: 'fan', label: 'Fan', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 12c4 0 7 3 7 7" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 12c0 4-3 7-7 7" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { key: 'computer', label: 'Computer', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="12" rx="2" stroke="#2B6CB0" strokeWidth="1.2" /><path d="M8 20h8" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" /></svg>) },
  { key: 'bench', label: 'Benches', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="20" height="3" rx="1" stroke="#2B6CB0" strokeWidth="1.2" /><path d="M6 20v-6" stroke="#2B6CB0" strokeWidth="1.2" /><path d="M18 20v-6" stroke="#2B6CB0" strokeWidth="1.2" /></svg>) },
  { key: 'water', label: 'Water', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2s5 5 5 9a5 5 0 11-10 0c0-4 5-9 5-9z" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { key: 'clean', label: 'Cleanliness', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l1.5 3L17 8l-3 1-1.5 3L11 9 8 8l3.5-2L12 3z" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { key: 'canteen', label: 'Canteen', svg: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16v6a4 4 0 01-4 4H8a4 4 0 01-4-4V7z" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 3v4" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" /><path d="M16 3v4" stroke="#2B6CB0" strokeWidth="1.2" strokeLinecap="round" /></svg>) }
];

const IMAGES = [
  // 1. Keep: University Building (Exterior - Blue sky)
  'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1920&auto=format&fit=crop',
  // 2. New: Stanford Style Campus (Similar bright architecture)
  'https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=1920&auto=format&fit=crop',
  // 3. New: Grand University Hall (Matching blue sky theme)
  'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=1920&auto=format&fit=crop'
];

export default function Home() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % IMAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // preload
  React.useEffect(() => {
    IMAGES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  return (
    <div className="hero plain-hero">
      {IMAGES.map((img, i) => (
        <div
          key={img}
          className={`hero-slide ${i === index ? 'active' : ''}`}
          style={{ backgroundImage: `url(${img})` }}
        />
      ))}
      <div className="hero-overlay plain">
        <div className="hero-content">
          <div className="brand-hero">
            <img src="/logo-hero.png" alt="Campus Fix Logo" className="brand-logo-large" />
            <div className="brand-title">
              Campus<span className="brand-accent">Fix</span>
            </div>
          </div>

          <p className="brand-subtitle">Report and track facility issues across your college campus. Help us maintain a better learning environment for everyone.</p>

          {/* Register CTA removed from hero (header has Register/Login) */}

          <div className="icon-grid" role="list" aria-label="Issue categories">
            {ICONS.map(ic => (
              <div key={ic.key} className="icon-tile" role="listitem" title={ic.label}>
                <div className="icon-inner">{ic.svg}</div>
                <div className="icon-label">{ic.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


