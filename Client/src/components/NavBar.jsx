import { Link, useLocation } from 'react-router-dom';

function NavBar({ isLoggedIn }) {
  const userId = localStorage.getItem('userId');
  const location = useLocation(); // 현재 경로 확인용

  // 현재 활성화된 탭인지 확인하는 함수
  const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item';

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>🏠 홈</Link>
        <Link to="/decision" className={isActive('/decision')}>⚖️ 할래말래</Link>
        <Link to="/game/survival" className={isActive('/game/survival')}>🕹️ 게임</Link>
        <Link to="/fortune" className={isActive('/fortune')}>🔮 운세</Link>
        <Link to="/nearby" className={isActive('/nearby')}>📍 주변</Link>
        <Link to="/our-map" className={isActive('/our-map')}>🗺️ 찐맛집</Link>
        <Link to="/roulette" className={isActive('/roulette')}>🎰 룰렛</Link>
        <Link to="/group" className={isActive('/group')}>🤝 뭐먹</Link>
        <Link to="/ranking" className={isActive('/ranking')}>🏆 랭킹</Link>
      </div>

      {isLoggedIn ? (
        <Link to={`/author/${userId}`} className="nav-item" style={{ color: '#2196F3' }}>
          😎
        </Link>
      ) : (
        <Link to="/login" className="nav-item" style={{ color: '#4CAF50' }}>🔑</Link>
      )}
    </nav>
  );
}

export default NavBar;