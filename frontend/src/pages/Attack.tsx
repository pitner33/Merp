import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Attack() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'ATTACK';
  }, []);

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>ATTACK</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              const homeUrl = new URL('/home', window.location.origin).toString();
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.location.href = homeUrl;
                  window.opener.focus();
                  window.close();
                  return;
                } catch {}
              }
              navigate('/home');
            } catch {}
          }}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Back to the Inn
        </button>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p>This page is reserved for ATTACK tools.</p>
      </div>
    </div>
  );
}
