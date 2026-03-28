export function FilterPanel({ filterRole, filterStatus, search, onRoleChange, onStatusChange, onSearchChange, roleCounts }) {
  const inputStyle = {
    background: 'var(--c-bg)',
    border: '1px solid var(--c-border)',
    color: 'var(--c-text)',
    padding: '5px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Search ID or name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ ...inputStyle, flex: '1 1 120px', minWidth: 0 }}
      />
      <select
        value={filterRole}
        onChange={(e) => onRoleChange(e.target.value)}
        style={{ ...inputStyle, flex: '0 0 auto' }}
      >
        <option value="">All roles</option>
        <option value="GTA">GTA</option>
        <option value="TDM">TDM</option>
        <option value="ADM">ADM</option>
        <option value="SEC">SEC</option>
      </select>
      <select
        value={filterStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ ...inputStyle, flex: '0 0 auto' }}
      >
        <option value="">All status</option>
        <option value="active">Active</option>
        <option value="stale">Stale</option>
        <option value="offline">Offline</option>
      </select>
    </div>
  );
}
