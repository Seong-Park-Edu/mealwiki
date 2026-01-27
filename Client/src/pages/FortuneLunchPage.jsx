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
            console.log("앱으로부터 광고 완료 신호 수신!");
            setIsAdFinished(true); // 광고 완료 상태 업데이트

            // ★ 중요: 광고가 끝났을 때만 실제 분석 로직 실행
            const savedData = localStorage.getItem('fortune_user_data');
            if (savedData) {
              runAnalysis(JSON.parse(savedData));
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
  }, []); // 의존성 배열을 비워 처음에 한 번만 리스너 등록

  // 3. 시작 버튼 클릭
  const handleStart = () => {
    if (!name.trim()) return alert("이름을 입력해주세요!");
    if (!birthDate || !birthTime) return alert("생년월일과 시간을 모두 입력해주세요!");

    const userData = { name, birthDate, birthTime, gender, mealType };
    localStorage.setItem('fortune_user_data', JSON.stringify(userData));

    // ★ [수정] 바로 runAnalysis를 호출하지 않습니다.
    if (isApp) {
      // 1) 앱 환경이면 광고 먼저 띄우라고 요청
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOW_REWARD_AD' }));

      // 3초 뒤에도 광고 신호가 안 오면 로딩을 풀어서 다시 누를 수 있게 함
      setTimeout(() => {
        if (!isAdFinished) {
          setLoading(false);
          alert("광고 준비가 늦어지고 있습니다. 잠시 후 다시 시도해주세요.");
        }
      }, 3000);


    } else {
      // 2) 일반 웹 브라우저면 바로 분석 실행
      setIsAdFinished(true);
      runAnalysis(userData);
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

          <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>식사 유형</label>
          <div style={{
            display: 'flex', background: '#f0f0f0', padding: '5px', borderRadius: '15px', gap: '5px'
          }}>
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

          {/* ... (입력 폼 코드는 기존과 동일) ... */}
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="wiki-textarea" // CSS 클래스 적용
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>성별</label>
            {/* 성별 선택 영역 수정 */}
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

          {/* 생년월일 입력창 */}
          <div style={{ marginBottom: '20px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              생년월일
            </label>
            <DatePicker
              selected={birthDate ? new Date(birthDate) : null}
              onChange={(date) => {
                // yyyy-MM-dd 형식으로 변환하여 저장
                const d = date.toISOString().split('T')[0];
                setBirthDate(d);
              }}
              dateFormat="yyyy년 MM월 dd일"
              locale="ko"
              placeholderText="날짜를 선택하세요"
              className="custom-datepicker"

              // ★ 핵심: 연도/월 선택을 드롭다운으로 변경
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={100} // 표시할 연도 범위
              maxDate={new Date()} // 오늘 이후 날짜 선택 방지
            />
          </div>

          {/* 태어난 시간 입력창 */}
          <div style={{ marginBottom: '30px' }}>
            <label className="sub-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              태어난 시간
            </label>
            <DatePicker
              selected={birthTime ? new Date(`2000-01-01T${birthTime}`) : null}
              onChange={(date) => {
                if (date) {
                  // HH:mm 형식으로 추출 (예: 14:30)
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  setBirthTime(`${hours}:${minutes}`);
                }
              }}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={1} // 1분 단위로 선택 (필요시 15분 등으로 조절 가능)
              timeCaption="시간"
              dateFormat="aa h:mm" // 오전/오후 1:30 형식으로 표시
              locale="ko"
              placeholderText="시간을 선택하세요"
              className="custom-datepicker" // 앞서 만든 CSS 클래스 재사용
            />
          </div>

          <button className="btn-primary" onClick={handleStart} disabled={loading}>
            {loading ? '천기누설 중... ☁️' : (isApp ? '📺 광고 보고 결과받기' : '결과 확인하기')}
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

          {/* [배치 2] 결과 화면 하단 광고 - 웹 접속자에게만 노출 */}
          <AdSenseUnit isApp={isApp} slotId="1766153326" />

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