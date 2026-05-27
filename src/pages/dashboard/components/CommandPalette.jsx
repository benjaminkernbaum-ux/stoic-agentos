import { useState, useEffect, useCallback } from 'react';
import { CMD_ITEMS } from '../constants';

export default function CommandPalette({ cmdOpen, setCmdOpen, cmdQuery, setCmdQuery, cmdInputRef, setActiveTab }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filteredCmds = CMD_ITEMS.filter(item =>
    !cmdQuery || item.name.toLowerCase().includes(cmdQuery.toLowerCase()) || item.desc.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  // Reset selection when query changes
  useEffect(() => { setSelectedIdx(0); }, [cmdQuery]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => (i + 1) % filteredCmds.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => (i - 1 + filteredCmds.length) % filteredCmds.length);
    } else if (e.key === 'Enter' && filteredCmds.length > 0) {
      e.preventDefault();
      setActiveTab(filteredCmds[selectedIdx].tab);
      setCmdOpen(false);
    }
  }, [filteredCmds, selectedIdx, setActiveTab, setCmdOpen]);

  if (!cmdOpen) return null;

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
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-esc">ESC</span>
        </div>
        <div className="cmd-section-label">Navigation</div>
        {filteredCmds.map((item, idx) => (
          <div
            key={item.id}
            className={`cmd-item${idx === selectedIdx ? ' cmd-item-selected' : ''}`}
            onClick={() => { setActiveTab(item.tab); setCmdOpen(false); }}
            onMouseEnter={() => setSelectedIdx(idx)}
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
