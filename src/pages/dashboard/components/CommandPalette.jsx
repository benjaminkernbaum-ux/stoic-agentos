import { CMD_ITEMS } from '../constants';

export default function CommandPalette({ cmdOpen, setCmdOpen, cmdQuery, setCmdQuery, cmdInputRef, setActiveTab }) {
  if (!cmdOpen) return null;

  const filteredCmds = CMD_ITEMS.filter(item =>
    !cmdQuery || item.name.toLowerCase().includes(cmdQuery.toLowerCase()) || item.desc.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  return (
    <div className="cmd-backdrop" onClick={() => setCmdOpen(false)}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <span className="cmd-search-icon">🔍</span>
          <input
            ref={cmdInputRef}
            className="cmd-input"
            placeholder="Search or jump to..."
            value={cmdQuery}
            onChange={e => setCmdQuery(e.target.value)}
          />
          <span className="cmd-esc">ESC</span>
        </div>
        <div className="cmd-section-label">Navigation</div>
        {filteredCmds.map(item => (
          <div
            key={item.id}
            className="cmd-item"
            onClick={() => { setActiveTab(item.tab); setCmdOpen(false); }}
          >
            <div className="cmd-item-icon">{item.icon}</div>
            <div className="cmd-item-text">
              <div className="cmd-item-name">{item.name}</div>
              <div className="cmd-item-desc">{item.desc}</div>
            </div>
            <span className="cmd-item-badge">→</span>
          </div>
        ))}
        <div className="cmd-footer">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
}
