import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  primary: '#2f5597',
  textPrimary: '#123066',
  surface: '#f9fafb',
  border: '#ddd'
} as const;

export default function CreateCharacterEarlyYears() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Character Creation – Early Years';
  }, []);

  function handleBack() {
    navigate('/create-character');
  }

  function handleNext() {
    // TODO: wire up next phase when available
    console.info('Proceed to next creation phase – coming soon.');
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>
          Character Creation – Early Years
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
          .early-years-section {
            background: #fff;
            border-radius: 8px;
            border: 1px solid ${COLORS.border};
            box-shadow: 0 2px 8px rgba(47,85,151,0.1);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .early-years-title {
            margin: 0;
            color: ${COLORS.primary};
            font-size: 20px;
          }
          .panel-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: 1fr;
          }
          .panel-grid.cols-3 {
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          .panel-grid.cols-2 {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          }
          .panel {
            border: 1px solid ${COLORS.border};
            border-radius: 8px;
            background: ${COLORS.surface};
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .panel h3 {
            margin: 0;
            color: ${COLORS.primary};
            font-size: 16px;
          }
          .panel table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          .panel table thead th {
            background: ${COLORS.primary};
            color: #fff;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.03em;
          }
          .panel th,
          .panel td {
            border: 1px solid ${COLORS.border};
            padding: 6px 8px;
            text-align: left;
            color: ${COLORS.textPrimary ?? '#123066'};
          }
          .panel tbody th {
            background: rgba(47,85,151,0.08);
            width: 40%;
          }
        `}
      </style>

      <section className="early-years-section">
        <h2 className="early-years-title">Foundational Information</h2>
        <div className="panel-grid cols-3">
          <section className="panel">
            <h3>Character Base Data</h3>
            <table>
              <tbody>
                <tr>
                  <th scope="row">Name</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Culture</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Profession</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Height</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Weight</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Notable Traits</th>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>Spell Lists</h3>
            <table>
              <thead>
                <tr>
                  <th>Spell List</th>
                  <th>Rank</th>
                  <th>Chance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>Languages</h3>
            <table>
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Fluency</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <section className="early-years-section">
        <h2 className="early-years-title">Progression Metrics</h2>
        <div className="panel-grid cols-2">
          <section className="panel">
            <h3>Attributes &amp; Bonuses</h3>
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Base</th>
                  <th>Normal Bonus</th>
                  <th>Race Bonus</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {['STR', 'DEX', 'CON', 'IQ', 'IT', 'CH'].map((attribute) => (
                  <tr key={attribute}>
                    <td>{attribute}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>Level, XP &amp; Bonuses</h3>
            <table>
              <tbody>
                <tr>
                  <th scope="row">Current Level</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Total XP</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">XP to Next Level</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Training Points</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Armor Bonus</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Shield Bonus</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Misc Bonuses</th>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <section className="early-years-section">
        <h2 className="early-years-title">Skills &amp; Specialties</h2>
        <div className="panel-grid">
          <section className="panel">
            <h3>Skill Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Category</th>
                  <th>Rank</th>
                  <th>Stat Bonus</th>
                  <th>Other Bonus</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Melee Combat</td>
                  <td>Combat</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Archery</td>
                  <td>Ranged</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Spell Casting</td>
                  <td>Magic</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Stealth</td>
                  <td>Subterfuge</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Perception</td>
                  <td>Senses</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </div>
  );
}
