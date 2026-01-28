import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Link 대신 navigate 사용
import axios from 'axios';
import AdSenseUnit from '../components/AdSenseUnit'; // ★ 경로 주의 (상위 폴더로 한 번 나가야 함)

function SearchHome() {
  const [keyword, setKeyword] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [isApp, setIsApp] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
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
    if (activeTag === tag) {
      setActiveTag(null);
      setRestaurants([]);
      return;
    }

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      searchRestaurants();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="page-container">
      <h1 className="title text-center">🍽️ 맛집 위키</h1>

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
                onClick={() => setSelectedRestaurant(r)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                    {r.place_name}
                  </h3>
                  <span style={{ color: '#ccc' }}>›</span>
                </div>
                <div className="sub-text">📍 {r.road_address_name || r.address_name}</div>
                <div className="category-badge">{r.category_name || '맛집'}</div>
              </div>

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

      <AdSenseUnit isApp={isApp} slotId="4765837285" />
    </div>
  );
}

export default SearchHome;