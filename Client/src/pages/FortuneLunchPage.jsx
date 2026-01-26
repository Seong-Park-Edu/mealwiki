import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import KakaoMap from '../components/KakaoMap';
import AdSenseUnit from '../components/AdSenseUnit';

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
  const [birthTime, setBirthTime] = useState('00:00');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [places, setPlaces] = useState([]);
  const [isApp, setIsApp] = useState(false);

  const [isAdFinished, setIsAdFinished] = useState(false);

  // ★ [추가됨] 결과 없음 안내창을 닫았는지 체크하는 상태
  const [hideNoResult, setHideNoResult] = useState(false);

  // 1. 페이지 로드 시 데이터 복구
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

  // 2. 앱 환경 감지 및 광고 완료 처리
  // [수정된 2번 useEffect 부분]
  useEffect(() => {
    // 1. 이름표(User-Agent)와 WebView 객체 둘 다 확인하여 더 확실하게 판별합니다.
    const ua = window.navigator.userAgent;
    const isAppUA = ua.indexOf('MealWikiApp') !== -1;
    const isWebView = !!window.ReactNativeWebView;

    if (isAppUA || isWebView) {
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
  }, [loading, result]); // 의존성 배열에 필요한 상태 추가

  // 3. 시작 버튼 클릭
  const handleStart = () => {
    if (!name.trim()) return alert("이름을 입력해주세요!");
    if (!birthDate || !birthTime) return alert("생년월일과 시간을 모두 입력해주세요!");

    const userData = { name, birthDate, birthTime, gender, mealType };
    localStorage.setItem('fortune_user_data', JSON.stringify(userData));

    // 분석 시작
    runAnalysis(userData);

    if (isApp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOW_REWARD_AD' }));
    } else {
      setIsAdFinished(true);
    }
  };

  // 4. AI 분석 및 맛집 검색 실행
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
    setHideNoResult(false); // ★ [핵심] 새 분석을 시작할 때, 안내창 숨김 상태를 초기화합니다.

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
              setPlaces([]);
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

  // 처음으로 돌아가기 (초기화)
  const handleRetry = () => {
    setResult(null);
    setPlaces([]);
  };

  const handleMarkerClick = (place) => {
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

  // ★ [추가됨] 안내창 닫기 버튼 핸들러
  const handleCloseOverlay = () => {
    setHideNoResult(true); // 그냥 안내창만 안 보이게 설정
  };

  const showResult = result && isAdFinished;

  return (
    <div className="page-container">
      <div className="text-center" style={{ marginBottom: '30px' }}>
        <h1 className="title" style={{ marginBottom: '5px' }}>🔮 운세 메뉴</h1>
        <p className="sub-text">당신의 사주를 분석해 오늘의 메뉴를 추천해 드립니다.</p>
      </div>

      {!showResult && (
        <div className="wiki-editor-card">
          {/* ... (입력 폼 코드는 기존과 동일) ... */}
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

          {/* [배치 2] 결과 화면 상단 광고 - 웹 접속자에게만 노출 */}
          <AdSenseUnit isApp={isApp} slotId="3598109744" />


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

          {/* ▼▼▼ [추가] 인피드 광고 배치 (메뉴 카드와 지도 사이) ▼▼▼ */}
          {/* 앱(WebView)에서는 자동으로 숨겨지고, 웹에서만 보입니다 */}
          <div style={{ margin: '20px 0' }}>
            <AdSenseUnit
              isApp={isApp}
              slotId="9655417483" // ★ 애드센스 '인피드 광고' 단위 ID 입력
              format="fluid"      // 인피드 광고는 fluid 형식이 자연스럽습니다
              layoutKey="-gw-3+1f-3d+2z" // (선택) 인피드 광고 생성 시 주는 키
            />
          </div>
          {/* ▲▲▲ [여기까지 추가] ▲▲▲ */}

          {/* 지도 영역 */}
          <div className="wiki-editor-card" style={{ padding: '0', overflow: 'hidden', height: '300px' }}>
            {myLoc.loaded ? (
              <KakaoMap center={myLoc} markers={places} onMarkerClick={handleMarkerClick} />
            ) : (
              <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
                📡 위치 정보를 불러오는 중...
              </div>
            )}

            {/* ★ [수정됨] hideNoResult가 false일 때만 안내창 표시 */}
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
                  아쉽지만 근처에는 이 메뉴를 파는 곳이 없네요.</p>
                {/* 버튼 클릭 시 안내창 닫기 */}
                <button
                  onClick={handleCloseOverlay}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '14px', backgroundColor: '#666' }}
                >
                  확인 (창 닫기)
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

      {/* ▼▼▼ [추가] 로딩 오버레이 (loading이 true일 때만 화면을 덮습니다) ▼▼▼ */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // 배경을 하얗게 덮음
          zIndex: 9999, // 제일 위에 뜨게 함
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* 빙글빙글 도는 애니메이션 (CSS로 처리하거나 gif 이미지 사용 가능) */}
          <div className="spinner" style={{ fontSize: '50px', marginBottom: '20px' }}>
            🔮
          </div>

          <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>
            우주의 기운을 모으는 중...
          </h2>

          <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
            사주를 분석하고 맛집을 찾고 있어요.<br />
            <strong>최대 10초</strong> 정도 걸릴 수 있습니다.<br />
            잠시만 기다려주세요! 🙏
          </p>
        </div>
      )}
      {/* ▲▲▲ [여기까지 추가] ▲▲▲ */}


    </div>
  );
};

export default FortuneLunchPage;