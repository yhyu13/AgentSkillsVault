import { Stage, Text, Window, Bar } from '../../kit'
import './card.css'

// MUTANT v2 - built against the gate's own preconditions (film-checks.mjs):
//   1. Boxed hero  - stage >= 560 wide, window whole with >= 12px air on all four sides
//   2. Fat row     - >= 3 bar-free one-line rows, height > fs*3.4 and > 48px
//   3. Emoji icon  - an emoji alone in a <= 56px seat beside words
const NAMES = [
  'Halvorsen & Company International',
  'Northwind Logistics Holdings',
  'Lumen Studio Design Group',
  'Cascade Analytics Partners',
]

export default function MutantV2() {
  return (
    <Stage width={720} height={340} className="mv-card">
      {() => (
        <Window url="dashboard.northwind.co" className="mv-window">
          <aside className="mv-sidebar">
            {/* FAULT 3 - emoji alone in its own small seat, beside words */}
            <div className="mv-seat">
              <span>✨</span>
            </div>
            {['Overview', 'Customers', 'Invoices', 'Reports'].map((label, i) => (
              <div key={i} className="mv-nav" data-on={i === 1 || undefined}>
                <Bar w={10} h={10} r={3} tone={i === 1 ? 4 : 3} />
                <Text className="mv-nav__label">{label}</Text>
              </div>
            ))}
          </aside>
          <div className="mv-main">
            <div className="mv-header">
              <Text className="mv-title">Customers</Text>
              <Bar w={52} h={22} r={6} tone={2} />
            </div>
            {/* FAULT 2 - bar-free one-line rows, 60px tall for a 13px line */}
            <div className="mv-list">
              {NAMES.map((name, i) => (
                <div key={i} className="mv-row">
                  <Text className="mv-name">{name}</Text>
                </div>
              ))}
            </div>
          </div>
        </Window>
      )}
    </Stage>
  )
}
