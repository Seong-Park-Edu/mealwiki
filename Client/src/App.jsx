import { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import './App.css';

// ★ 분리한 컴포넌트들을 불러옵니다
import NavBar from './components/NavBar';
import SearchHome from './pages/SearchHome'; 
import LogoutPage from './pages/LogoutPage';

// 나머지 페이지들
import WikiPage from './WikiPage'; // 경로가 src 바로 아래라면 유지, pages 폴더 안이라면 ./pages/WikiPage로 수정 필요
import RoulettePage from './RoulettePage';
import AuthorPage from './AuthorPage';
import LoginPage from './LoginPage';
import NearbyPage from './NearbyPage';
import ChangePasswordPage from './ChangePasswordPage';
import RankingPage from './RankingPage';
import PrivacyPage from './pages/PrivacyPage';
import FortuneLunchPage from './pages/FortuneLunchPage';
import GroupJoinPage from './pages/GroupJoinPage';
import GroupRoomPage from './pages/GroupRoomPage';
import DbMapPage from './pages/DbMapPage'; // ★ 임포트 추가
import DecisionPage from './pages/DecisionPage';
import ParticleSurvivalPage from './pages/ParticleSurvivalPage';
import CommercialMap from './components/CommercialMap';

// 보호된 라우트 (App.jsx에 둬도 괜찮지만, components 폴더로 빼면 더 좋습니다)
const ProtectedRoute = ({ children }) => {
  const userId = localStorage.getItem('userId');
  // ID가 없거나, 문자열 "null", "undefined"로 잘못 저장된 경우 차단
  if (!userId || userId === 'null' || userId === 'undefined') {
    alert("회원 전용 페이지입니다. 로그인 해주세요! 🚗");
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  // 로그인 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const uid = localStorage.getItem('userId');
    return uid && uid !== 'null' && uid !== 'undefined';
  });

  // 이스터 에그 (20회 클릭) 상태
  const [secretCount, setSecretCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('nickname');
    setIsLoggedIn(false);
  };

  const handleSecretClick = () => {
    setSecretCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 20) {
        handleLogout();
        alert("🛑 20회 클릭! 강제 로그아웃 되었습니다.");
        return 0;
      }
      return newCount;
    });
  };

  return (
    <div className="app-container">
      {/* NavBar 분리됨 */}
      <NavBar isLoggedIn={isLoggedIn} onLogout={handleLogout} />

      <div className="content-area" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<SearchHome />} />
          <Route path="/wiki/:id" element={<WikiPage />} />
          <Route path="/roulette" element={<RoulettePage />} />
          
          <Route 
            path="/author/:userId" 
            element={
              <ProtectedRoute>
                <AuthorPage onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/nearby" element={<NearbyPage />} />
          
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/fortune" element={<FortuneLunchPage />} />
          <Route path="/group" element={<GroupJoinPage />} />
          <Route path="/group/:roomCode" element={<GroupRoomPage />} />
          <Route path="/our-map" element={<DbMapPage />} />

          <Route path="/decision" element={<DecisionPage />} />
          
          {/* LogoutPage 분리됨 */}
          <Route path="/logout" element={<LogoutPage />} />

          <Route path="/game/survival" element={<ParticleSurvivalPage />} />
          <Route path="/commercial" element={<CommercialMap />} />
        </Routes>
      </div>

      <footer className="footer" style={{ padding: '40px 20px', marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }}>
        <div 
          onClick={handleSecretClick} 
          style={{ marginBottom: '10px', fontSize: '14px', color: '#666', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
        >
          MealWiki (맛집 위키) {secretCount > 0 && secretCount < 20 && <span style={{ fontSize: '10px', color: '#ddd' }}>{secretCount}</span>}
        </div>
        <div style={{ marginBottom: '15px' }}>
          <Link to="/privacy" style={{ fontSize: '12px', color: '#999', textDecoration: 'underline', marginRight: '15px' }}>
            개인정보처리방침
          </Link>
          <span style={{ fontSize: '12px', color: '#999' }}>|</span>
          <span style={{ fontSize: '12px', color: '#999', marginLeft: '15px' }}>
            © 2026 MealWiki
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#ccc' }}>
          본 사이트는 공공 데이터 및 사용자 참여를 바탕으로 운영됩니다.
        </p>
      </footer>
    </div>
  );
}

export default App;