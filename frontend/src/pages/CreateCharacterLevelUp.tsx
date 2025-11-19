import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const COLORS = {
  primary: '#2f5597',
  textPrimary: '#123066',
  surface: '#f9fafb',
  border: '#ddd',
  danger: '#7a1f1f'
} as const;

export default function CreateCharacterLevelUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { fromEarlyYears?: unknown } | undefined;

  useEffect(() => {
    document.title = 'Character Creation – Level Up';
  }, []);

  function handleBack() {
    navigate('/create-character-early-years', { state: locationState });
  }

  function handleNext() {
    console.info('Proceed to next creation phase – coming soon.');
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>
          Character Creation – Level Up
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            padding: '6px 12px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          style={{
            padding: '6px 12px',
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Next
        </button>
      </div>
      <style>
        {`
          .level-up-section {
            background: #fff;
            border-radius: 8px;
            border: 1px solid ${COLORS.border};
            box-shadow: 0 2px 8px rgba(47,85,151,0.1);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .level-up-title {
            margin: 0;
            color: ${COLORS.primary};
            font-size: 20px;
          }
          .placeholder-panel {
            border: 1px solid ${COLORS.border};
            border-radius: 8px;
            background: ${COLORS.surface};
            padding: 16px;
            color: ${COLORS.textPrimary};
          }
        `}
      </style>

      <section className="level-up-section">
        <h2 className="level-up-title">Level Advancement (Coming Soon)</h2>
        <div className="placeholder-panel">
          <p style={{ margin: 0 }}>
            This section will guide you through levelling up your character. The system has preserved your Early Years selections in case you
            navigate back.
          </p>
        </div>
      </section>
    </div>
  );
}
