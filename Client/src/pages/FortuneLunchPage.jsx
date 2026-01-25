import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import KakaoMap from '../components/KakaoMap';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5068';

// API 호출 함수
const fetchFortuneAnalysis = async (name, birthDate, birthTime, gender, mealType) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birthDate, birthTime, gender, mealType }),
    });
    if (!response.ok) throw new Error('서버 통신 오류');

    const text = await response.json();
    return typeof text === 'string' ? JSON.parse(text) : text;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const FortuneLunchPage = () => {
  const navigate = useNavigate();
  const myLoc = useGeolocation();

  // 상태 관리
  const [gender, setGender] = useState('male');
  const [mealType, setMealType] = useState('점심');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [places, setPlaces] = useState([]);
  const [isApp, setIsApp] = useState(false);
  const [isAdFinished, setIsAdFinished] = useState(false);
  const [hideNoResult, setHideNoResult] = useState(false);

  // 1. 초기화 (데이터 복구)
  useEffect(() => {
    const savedData = localStorage.getItem('fortune_user_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.name) setName(parsed.name);
        if (parsed.birthDate) setBirthDate(parsed.birthDate);
        if (parsed.birthTime) setBirthTime(parsed.birthTime);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.mealType) setMealType(parsed.mealType);
      } catch (e) { }
    }
  }, []);

  // 2. 앱 환경 감지
  useEffect(() => {
    if (window.ReactNativeWebView) {
      setIsApp(true);
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'AD_COMPLETED') {
            setIsAdFinished(true);
            if (!loading && !result) {
              const savedJson = localStorage.getItem('fortune_user_data');
              if (savedJson) runAnalysis(JSON.parse(savedJson));
            }
          }
        } catch (e) { }
      };
      window.addEventListener('message', handleMessage);
      document.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
        document.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // 3. 시작 버튼
  const handleStart = () => {
    if (!name.trim()) return alert("이름을 입력해주세요!");
    if (!birthDate || !birthTime) return alert("생년월일과 시간을 모두 입력해주세요!");

    const userData = { name, birthDate, birthTime, gender, mealType };
    localStorage.setItem('fortune_user_data', JSON.stringify(userData));

    runAnalysis(userData);

    if (isApp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOW_REWARD_AD' }));
    } else {
      setIsAdFinished(true);
    }
  };

  // 4. 분석 및 검색
  const runAnalysis = async (dataOverride = null) => {
    const targetName = dataOverride ? dataOverride.name : name;
    const targetBirthDate = dataOverride ? dataOverride.birthDate : birthDate;
    const targetBirthTime = dataOverride ? dataOverride.birthTime : birthTime;
    const targetGender = dataOverride ? dataOverride.gender : gender;
    const targetMealType = dataOverride ? dataOverride.mealType : mealType;

    if (!targetName || !targetName.trim()) return alert("이름을 입력해주세요!");

    setLoading(true);
    setResult(null);
    setPlaces([]);
    setHideNoResult(false);

    try {
      const aiData = await fetchFortuneAnalysis(targetName, targetBirthDate, targetBirthTime, targetGender, targetMealType);

      if (aiData) {
        setResult(aiData);

        if (window.kakao && myLoc.loaded && window.kakao.maps.services) {
          const ps = new window.kakao.maps.services.Places();
          const searchOptions = {
            location: new window.kakao.maps.LatLng(myLoc.lat, myLoc.lng),
            radius: 1500,
            sort: window.kakao.maps.services.SortBy.DISTANCE
          };

          ps.keywordSearch(aiData.menu, (data, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              setPlaces(data);
            } else {
              setPlaces([]); // 검색 결과 0개
            }
          }, searchOptions);
        }
      } else {
        alert("운세 분석에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("분석 중 에러:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReRecommend = () => {
    const savedJson = localStorage.getItem('fortune_user_data');
    if (savedJson) {
      runAnalysis(JSON.parse(savedJson));
    } else {
      handleRetry();
    }
  };

  const handleRetry = () => {
    setResult(null);
    setPlaces([]);
  };

  const handleCloseOverlay = () => {
    setHideNoResult(true);
  };

  const handleMarkerClick = (place) => {
    // ★ [수정] 내 위치 마커를 클릭했을 때는 아무 동작 안 함
    if (place.id === 'my_location_marker') return;

    navigate(`/wiki/${place.id}`, {
      state: {
        name: place.place_name,
        address: place.road_address_name,
        menuName: result.menu,
        x: place.x,
        y: place.y
      }
    });
  };

  const showResult = result && isAdFinished;

  // ★ [핵심] 지도에 표시할 마커 목록 계산
  // 검색 결과가 있으면 식당들을 보여주고, 없으면 '내 위치' 하나만 보여줌
  let displayMarkers = places;
  if (myLoc.loaded && places.length === 0) {
    displayMarkers = [{
      id: 'my_location_marker',     // 특수 ID
      place_name: '📍 현재 내 위치', // 마커 이름
      road_address_name: '주변에 추천 메뉴를 파는 식당이 없어요.',
      x: myLoc.lng,                 // 내 위치 경도
      y: myLoc.lat                  // 내 위치 위도
    }];
  }

  return (
    <div className="page-container">
      <div className="text-center" style={{ marginBottom: '30px' }}>
        <h1 className="title" style={{ marginBottom: '5px' }}>🔮 운세 메뉴</h1>
        <p className="sub-text">당신의 사주를 분석해 오늘의 메뉴를 추천해 드립니다.</p>
      </div>

      {!showResult && (
        <div className="wiki-editor-card">
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요 (예: 홍길동)" style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '12px', background: '#FAFAFA' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>성별</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setGender('male')} className={`btn ${gender === 'male' ? 'btn-primary' : ''}`} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: gender === 'male' ? 'var(--primary)' : '#fff', color: gender === 'male' ? '#fff' : '#333' }}>남성 ‍♂️</button>
              <button onClick={() => setGender('female')} className={`btn ${gender === 'female' ? 'btn-primary' : ''}`} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: gender === 'female' ? 'var(--primary)' : '#fff', color: gender === 'female' ? '#fff' : '#333' }}>여성 ‍♀️</button>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>어떤 식사를 추천받을까요?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['아침', '점심', '저녁'].map((type) => (
                <button key={type} onClick={() => setMealType(type)} className={`btn`} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: mealType === type ? 'var(--primary)' : '#fff', color: mealType === type ? '#fff' : '#333', fontWeight: mealType === type ? 'bold' : 'normal' }}>{type === '아침' ? '🌅 아침' : type === '점심' ? '☀️ 점심' : '🌙 저녁'}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>생년월일</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '12px', background: '#FAFAFA' }} />
          </div>
          <div style={{ marginBottom: '30px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>태어난 시간</label>
            <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '12px', background: '#FAFAFA' }} />
          </div>
          <button className="btn-primary" onClick={handleStart} disabled={loading}>
            {loading ? '천기누설 중... ☁️' : (isApp ? '📺 광고 보고 결과받기' : '결과 무료 확인하기')}
          </button>
        </div>
      )}

      {showResult && (
        <div className="animate-fade-in">
          <div className="wiki-header" style={{ textAlign: 'left' }}>
            <span className="category-badge">오늘의 운세</span>
            <p style={{ marginTop: '10px', lineHeight: '1.6', color: 'var(--text-main)' }}>{result.fortune}</p>
          </div>
          <div className="restaurant-card" style={{ border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="sub-text">행운의 메뉴</span>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', margin: '5px 0' }}>{result.menu}</h2>
              </div>
              <div style={{ fontSize: '40px' }}>🍱</div>
            </div>
            <p className="sub-text" style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>💡 {result.reason}</p>
          </div>

          <div className="wiki-editor-card" style={{ padding: '0', overflow: 'hidden', height: '300px' }}>
            {myLoc.loaded ? (
              <KakaoMap 
                center={myLoc} 
                // ★ [수정] 위에서 만든 displayMarkers를 넣어서 결과가 없어도 내 위치가 나옴
                markers={displayMarkers} 
                onMarkerClick={handleMarkerClick} 
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
                📡 위치 정보를 불러오는 중...
              </div>
            )}

            {myLoc.loaded && places.length === 0 && !hideNoResult && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(2px)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                textAlign: 'center', padding: '20px', zIndex: 10
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>😭</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>주변에 '{result.menu}' 식당이 없어요.</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                  아쉽지만 근처에는 파는 곳이 없네요.<br />
                  버튼을 누르면 현재 위치 지도를 볼 수 있습니다.
                </p>
                <button
                  onClick={handleCloseOverlay}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '14px', backgroundColor: '#666' }}
                >
                  확인 (지도 보기)
                </button>
                {/* 다른 메뉴 받기 버튼은 안내창 밖이나 아래에 배치해도 좋지만, 여기서는 지도 보기 우선 */}
                <button
                  onClick={handleReRecommend}
                  className="btn-action"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '14px', marginTop: '10px', backgroundColor: 'var(--primary)' }}
                >
                  🔄 다른 메뉴 받기
                </button>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className="btn-action"
              onClick={handleRetry}
              style={{
                backgroundColor: 'var(--primary)', color: 'white', border: 'none',
                padding: '15px', fontSize: '16px'
              }}
            >
              🔄 다시 하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FortuneLunchPage;