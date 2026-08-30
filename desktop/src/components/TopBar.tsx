import Logo from './Logo';
import type { User } from '../types';

export default function TopBar({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <Logo />
      <div className="topbar-actions">
        <div className="account-summary">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="account-copy">
            <strong>{user.name}</strong>
            <span>{user.role === 'ADMIN' ? 'Administrator' : 'Teacher'}</span>
          </div>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
