import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import WikiPage from './WikiPage';
import RoulettePage from './RoulettePage';
import AuthorPage from './AuthorPage';
import LoginPage from './LoginPage';
import NearbyPage from './NearbyPage';
import ChangePasswordPage from './ChangePasswordPage';
import RankingPage from './RankingPage';
import './App.css'; // ★ CSS 파일 임포트 필수

// NavBar 컴포넌트 (CSS 클래스 적용)
function NavBar({ isLoggedIn }) {
  const userId = localStorage.getItem('userId');
  const location = useLocation(); // 현재 경로 확인용

  // 현재 활성화된 탭인지 확인하는 함수
  const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item';

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>🏠 홈</Link>
        <Link to="/nearby" className={isActive('/nearby')}>📍 내주변</Link>
        <Link to="/roulette" className={isActive('/roulette')}>🎰 룰렛</Link>
        <Link to="/ranking" className={isActive('/ranking')}>🏆 랭킹</Link>
      </div>

      {isLoggedIn ? (
        <Link to={`/author/${userId}`} className="nav-item" style={{ color: '#2196F3' }}>
          😎 내정보
        </Link>
      ) : (
        <Link to="/login" className="nav-item" style={{ color: '#4CAF50' }}>🔑 로그인</Link>
      )}
    </nav>
  );
}

// 검색 화면 (SearchHome) - 카드 디자인 적용
function SearchHome() {
  const [keyword, setKeyword] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(null);

  const PREDEFINED_TAGS = ["🍚 혼밥가능", "👩‍❤️‍👨 데이트", "🍺 회식장소", "💸 가성비갑", "😋 JMT(존맛)", "✨ 분위기맛집", "😊 친절해요", "🚗 주차가능", "🏞️ 뷰맛집", "🤫 조용해요"];

  useEffect(() => {
    const savedKeyword = sessionStorage.getItem('lastKeyword');
    const savedList = sessionStorage.getItem('lastRestaurants');
    if (savedKeyword) setKeyword(savedKeyword);
    if (savedList) setRestaurants(JSON.parse(savedList));
  }, []);

  const searchRestaurants = async () => {
    if (!keyword) return;
    setLoading(true);
    setActiveTag(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
      const response = await axios.get(`${apiUrl}/api/food/search`, { params: { keyword: keyword } });
      setRestaurants(response.data);
      sessionStorage.setItem('lastKeyword', keyword);
      sessionStorage.setItem('lastRestaurants', JSON.stringify(response.data));
    } catch (error) { alert("서버 연결 실패"); } finally { setLoading(false); }
  };

  const handleTagFilter = async (tag) => {
    setLoading(true);
    setKeyword('');
    setActiveTag(tag);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
      const response = await axios.post(`${apiUrl}/api/wiki/filter-by-tag`, { restaurantIds: [], targetTag: tag });
      setRestaurants(response.data);
    } catch (error) { console.error(error); alert("오류 발생"); } finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <h1 className="title text-center">🍽️ 맛집 위키</h1>

      {/* ★ [수정됨] 둥근 캡슐형 검색창 적용 */}
      <div className="search-bar-wrapper">
        <input
          className="search-input-field"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchRestaurants()}
          placeholder="지역 + 메뉴 (예: 홍대 라멘)"
        />
        <button className="search-btn-inside" onClick={searchRestaurants}>
          🔍 검색
        </button>
      </div>

      {/* 태그 필터 영역 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '30px', justifyContent: 'center' }}>
        {PREDEFINED_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => handleTagFilter(tag)}
            className={`tag-btn ${activeTag === tag ? 'active' : ''}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 결과 리스트 */}
      {loading ? (
        <div className="text-center sub-text" style={{ padding: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🥘</div>
          맛집을 찾고 있어요...
        </div>
      ) : (
        <div>
          {activeTag && restaurants.length === 0 && (
            <div className="text-center sub-text" style={{ padding: '40px' }}>
              아직 '<strong>{activeTag}</strong>' 태그가 달린 맛집이 없어요. 😢<br />
              여러분이 첫 번째로 등록해 주세요!
            </div>
          )}

          {restaurants.map((r) => (
            <div key={r.id} className="restaurant-card">
              <Link
                to={`/wiki/${r.id}`}
                state={{ name: r.place_name, address: r.road_address_name, x: r.x, y: r.y }}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                    {r.place_name}
                  </h3>
                  <span style={{ color: '#ccc' }}>›</span>
                </div>
                <div className="sub-text">📍 {r.road_address_name}</div>
                <div className="category-badge">{r.category_name || '맛집'}</div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 메인 App 컴포넌트 (앱 컨테이너 적용)
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('userId'));

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('nickname');
    setIsLoggedIn(false);
  };

  return (
    <div className="app-container">
      <NavBar isLoggedIn={isLoggedIn} />
      <Routes>
        <Route path="/" element={<SearchHome />} />
        <Route path="/wiki/:id" element={<WikiPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/author/:userId" element={<AuthorPage onLogout={handleLogout} />} />
        <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/ranking" element={<RankingPage />} />
      </Routes>
    </div>
  );
}

export default App;