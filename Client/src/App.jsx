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
import PrivacyPage from './pages/PrivacyPage';
import FortuneLunchPage from './pages/FortuneLunchPage';
import './App.css'; // ★ CSS 파일 임포트 필수
import AdSenseUnit from './components/AdSenseUnit';

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
        <Link to="/fortune" className={isActive('/fortune')}>🔮 운세</Link>
        <Link to="/nearby" className={isActive('/nearby')}>📍 주변</Link>
        <Link to="/roulette" className={isActive('/roulette')}>🎰 룰렛</Link>
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

// 검색 화면 (SearchHome) - 카드 디자인 적용
function SearchHome() {
  const [keyword, setKeyword] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [isApp, setIsApp] = useState(false); // 앱 접속 여부 판단
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // ★ 추가: 선택된 식당 정보를 관리할 상태
  const navigate = useNavigate(); // Link 대신 navigate를 사용하기 위해 필요

  useEffect(() => {
    // 이름표(User-Agent)를 확인하여 앱 여부 판별
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
      setIsApp(true);
    }
  }, []);


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
    // 1. [비활성화 로직] 이미 선택된 태그를 다시 클릭한 경우
    if (activeTag === tag) {
      setActiveTag(null);    // 활성 태그 초기화
      setRestaurants([]);   // 리스트 초기화 (혹은 전체 목록 조회 함수 실행)
      return;               // 아래 API 호출을 실행하지 않고 함수 종료
    }

    // 2. [활성화 로직] 새로운 태그를 클릭한 경우
    setLoading(true);
    setKeyword('');
    setActiveTag(tag);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
      const response = await axios.post(`${apiUrl}/api/wiki/filter-by-tag`, {
        restaurantIds: [],
        targetTag: tag
      });
      setRestaurants(response.data);
    } catch (error) {
      console.error(error);
      alert("오류 발생");
    } finally {
      setLoading(false);
    }
  };


  // 검색 실행 함수에 blur 로직 추가
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      searchRestaurants(); // 검색 실행
      e.currentTarget.blur(); // ★ 핵심: 입력창에서 포커스를 빼서 자판을 내립니다.
    }
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
          onKeyDown={handleKeyDown}
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

          {restaurants.map((r, index) => (
            <div key={r.id}>
              <div
                className="restaurant-card"
                onClick={() => setSelectedRestaurant(r)} // ★ 클릭 시 모달 오픈을 위해 데이터 저장
                style={{ cursor: 'pointer' }}
              >
                {/* 기존 Link 태그는 삭제하고 내부 내용만 유지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                    {r.place_name}
                  </h3>
                  <span style={{ color: '#ccc' }}>›</span>
                </div>
                <div className="sub-text">📍 {r.road_address_name || r.address_name}</div>
                <div className="category-badge">{r.category_name || '맛집'}</div>
              </div>

              {/* [수정된 로직] 
           1. (index + 1) % 5 === 0 : 5번째, 10번째, 15번째... 항목 뒤에 광고 삽입
           2. index !== 0 : 혹시 모를 첫 번째 광고 노출 방지
            */}
              {(index + 1) % 5 === 0 && (
                <div style={{ margin: '20px 0' }}>
                  <AdSenseUnit
                    isApp={isApp}
                    slotId="8906276741"
                    format="fluid"
                    layoutKey="-fb+5w+4e-db+86"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}



      {/* ★ 선택 모달 UI 추가 */}
      {selectedRestaurant && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }} onClick={() => setSelectedRestaurant(null)}>

          <div style={{
            width: '100%', maxWidth: '320px', backgroundColor: 'white',
            borderRadius: '16px', padding: '24px', textAlign: 'center',
            animation: 'pop 0.3s ease'
          }} onClick={(e) => e.stopPropagation()}>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{selectedRestaurant.place_name}</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
              어디로 이동할까요?
            </p>

            {/* 1. 카카오 지도 (강조형) */}
            <button
              onClick={() => window.open(`https://place.map.kakao.com/${selectedRestaurant.id}`, '_blank')}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                border: 'none', background: '#FEE500', color: '#3C1E1E',
                fontWeight: 'bold', fontSize: '15px', marginBottom: '10px',
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              💛 카카오 지도 리뷰 보기
            </button>

            {/* 2. 내 wikipost (보조형) */}
            <button
              onClick={() => navigate(`/wiki/${selectedRestaurant.id}`, {
                state: {
                  name: selectedRestaurant.place_name,
                  address: selectedRestaurant.road_address_name || selectedRestaurant.address_name,
                  x: selectedRestaurant.x,
                  y: selectedRestaurant.y,
                  ...selectedRestaurant
                }
              })}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                border: '1px solid #ddd', background: 'white', color: '#555',
                fontWeight: '500', fontSize: '14px', cursor: 'pointer'
              }}
            >
              📝 MealWiki 상세 정보
            </button>

            <button
              onClick={() => setSelectedRestaurant(null)}
              style={{ marginTop: '15px', background: 'none', border: 'none', color: '#999', fontSize: '13px', textDecoration: 'underline' }}
            >
              취소
            </button>
          </div>
        </div>
      )}



      {/* [배치 1] 마지막 광고 */}
      <AdSenseUnit isApp={isApp} slotId="4765837285" />

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

      {/* 메인 콘텐츠 영역 */}
      <div className="content-area" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<SearchHome />} />
          <Route path="/wiki/:id" element={<WikiPage />} />
          <Route path="/roulette" element={<RoulettePage />} />
          <Route path="/author/:userId" element={<AuthorPage onLogout={handleLogout} />} />
          <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/nearby" element={<NearbyPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/fortune" element={<FortuneLunchPage />} />
        </Routes>
      </div>

      {/* ★ [추가] 하단 푸터 영역 */}
      <footer className="footer" style={{
        padding: '40px 20px',
        marginTop: '20px',
        textAlign: 'center',
        borderTop: '1px solid #eee',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
          MealWiki (맛집 위키)
        </div>
        <div style={{ marginBottom: '15px' }}>
          <Link to="/privacy" style={{
            fontSize: '12px',
            color: '#999',
            textDecoration: 'underline',
            marginRight: '15px'
          }}>
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