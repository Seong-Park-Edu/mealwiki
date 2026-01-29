import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import KakaoMap from '../components/KakaoMap';
import AdSenseUnit from '../components/AdSenseUnit';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
registerLocale("ko", ko);

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
  
  // 초기값 00:00 설정
  const [birthTime, setBirthTime] = useState('00:00');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [places, setPlaces] = useState([]);
  const [isApp, setIsApp] = useState(false);
  const [isAdFinished, setIsAdFinished] = useState(false);
  const [hideNoResult, setHideNoResult] = useState(false);

  // ★ [추가] 시/분 선택을 위한 배열 생성
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // 1. 데이터 복구
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
            const savedData = localStorage.getItem('fortune_user_data');
            if (savedData) runAnalysis(JSON.parse(savedData));
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

    if (isApp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOW_REWARD_AD' }));
      setTimeout(() => {
        if (!isAdFinished) {
          setLoading(false);
          alert("광고 준비가 늦어지고 있습니다. 잠시 후 다시 시도해주세요.");
        }
      }, 3000);
    } else {
      setIsAdFinished(true);
      runAnalysis(userData);
    }
  };

  // 4. 분석 실행
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

  const handleCloseOverlay = () => setHideNoResult(true);

  // ★ [추가] 시간 변경 핸들러
  const handleTimeChange = (type, value) => {
    const [currentHour, currentMinute] = birthTime.split(':');
    if (type === 'hour') {
      setBirthTime(`${value}:${currentMinute}`);
    } else {
      setBirthTime(`${currentHour}:${value}`);
    }
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
          {/* 식사 유형 */}
          <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>식사 유형</label>
          <div style={{ display: 'flex', background: '#f0f0f0', padding: '5px', borderRadius: '15px', gap: '5px' }}>
            {['아침', '점심', '저녁'].map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                  transition: 'all 0.3s',
                  background: mealType === type ? '#fff' : 'transparent',
                  color: mealType === type ? 'var(--primary)' : '#777',
                  fontWeight: mealType === type ? 'bold' : '500',
                  boxShadow: mealType === type ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {type === '아침' ? '🌅 아침' : type === '점심' ? '☀️ 점심' : '🌙 저녁'}
              </button>
            ))}
          </div>
          <p> </p>

          {/* 이름 입력 */}
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="wiki-textarea"
            />
          </div>

          {/* 성별 선택 */}
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>성별</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setGender('male')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '15px', border: 'none',
                  transition: 'all 0.2s ease',
                  background: gender === 'male' ? 'linear-gradient(135deg, #64B5F6, #2196F3)' : '#f0f0f0',
                  color: gender === 'male' ? '#fff' : '#888',
                  fontWeight: 'bold',
                  boxShadow: gender === 'male' ? '0 4px 10px rgba(33, 150, 243, 0.3)' : 'none',
                  transform: gender === 'male' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                남성 ♂️
              </button>
              <button
                onClick={() => setGender('female')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '15px', border: 'none',
                  transition: 'all 0.2s ease',
                  background: gender === 'female' ? 'linear-gradient(135deg, #F06292, #E91E63)' : '#f0f0f0',
                  color: gender === 'female' ? '#fff' : '#888',
                  fontWeight: 'bold',
                  boxShadow: gender === 'female' ? '0 4px 10px rgba(233, 30, 99, 0.3)' : 'none',
                  transform: gender === 'female' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                여성 ♀️
              </button>
            </div>
          </div>

          {/* 생년월일 입력 */}
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>생년월일</label>
            <DatePicker
              selected={birthDate ? new Date(birthDate) : null}
              onChange={(date) => {
                const d = date.toISOString().split('T')[0];
                setBirthDate(d);
              }}
              dateFormat="yyyy년 MM월 dd일"
              locale="ko"
              placeholderText="날짜를 선택하세요"
              className="custom-datepicker"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={100}
              maxDate={new Date()}
            />
          </div>

          {/* ★ [수정됨] 태어난 시간 입력 (시/분 분리) */}
          <div style={{ marginBottom: '30px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              태어난 시간
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* 시(Hour) 선택 */}
              <select
                value={birthTime.split(':')[0]}
                onChange={(e) => handleTimeChange('hour', e.target.value)}
                className="wiki-textarea" // 기존 스타일 재활용
                style={{ flex: 1, textAlign: 'center', appearance: 'none', cursor: 'pointer' }}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>

              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#555' }}>:</span>

              {/* 분(Minute) 선택 */}
              <select
                value={birthTime.split(':')[1]}
                onChange={(e) => handleTimeChange('minute', e.target.value)}
                className="wiki-textarea" // 기존 스타일 재활용
                style={{ flex: 1, textAlign: 'center', appearance: 'none', cursor: 'pointer' }}
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </div>

          <button className="btn-primary" onClick={handleStart} disabled={loading}>
            {loading ? '천기누설 중... ☁️' : (isApp ? '📺 광고 보고 결과받기' : '결과 확인하기')}
          </button>
          
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

          <div style={{ margin: '20px 0' }}>
            <AdSenseUnit isApp={isApp} slotId="9655417483" format="fluid" layoutKey="-gw-3+1f-3d+2z" />
          </div>

          <div className="wiki-editor-card" style={{ padding: '0', overflow: 'hidden', height: '300px' }}>
            {myLoc.loaded ? (
              <KakaoMap center={myLoc} markers={places} onMarkerClick={handleMarkerClick} />
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
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>아쉽지만 근처에는 이 메뉴를 파는 곳이 없네요.</p>
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
          <AdSenseUnit isApp={isApp} slotId="1766153326" />
        </div>
      )}

      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'
        }}>
          <div className="spinner" style={{ fontSize: '50px', marginBottom: '20px' }}>🔮</div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>우주의 기운을 모으는 중...</h2>
          <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
            사주를 분석하고 맛집을 찾고 있어요.<br />
            <strong>최대 10초</strong> 정도 걸릴 수 있습니다.<br />
            잠시만 기다려주세요! 🙏
          </p>
        </div>
      )}
    </div>
  );
};

export default FortuneLunchPage;