import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from './components/AdSenseUnit';

// 태그 목록
const PREDEFINED_TAGS = [
  "🍚 혼밥가능", "👩‍❤️‍👨 데이트", "🍺 회식장소", "💸 가성비갑",
  "😋 JMT(존맛)", "✨ 분위기맛집", "😊 친절해요",
  "🚗 주차가능", "🏞️ 뷰맛집", "🤫 조용해요"
];

const FOOD_CATEGORIES = [
  { name: "전체", code: "" },
  { name: "한식", code: "한식" },
  { name: "중식", code: "중식" },
  { name: "일식", code: "일식" },
  { name: "양식", code: "양식" },
  { name: "치킨", code: "치킨" },
  { name: "피자", code: "피자" },
  { name: "카페", code: "카페" },
];

function RoulettePage() {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

  // State 관리
  const [manualLocation, setManualLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("오늘 뭐 먹지?");
  const [displayContent, setDisplayContent] = useState("❓");

  const intervalRef = useRef(null);
  const [myLoc, setMyLoc] = useState(null);

  // 내 위치(GPS) 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLoc({ x: pos.coords.longitude, y: pos.coords.latitude }),
        (err) => console.error(err)
      );
    }
  }, []);


  // 앱 접속 여부 판단
  const [isApp, setIsApp] = useState(false);
  useEffect(() => {
    // 이름표(User-Agent)를 확인하여 앱 여부 판별
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
      setIsApp(true);
    }
  }, []);


  const handleStart = async () => {
    // 1. 위치 입력값 검증 (내 위치 GPS가 있더라도 룰렛 페이지의 의도에 맞게 입력 유도)
    if (!manualLocation.trim()) {
      return alert("📍 어디 근처에서 찾으실 건가요? \n예: '강남역', '성수동' 등을 입력해주세요!");
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setStatusMessage("맛집 스캔 중... 📡");

    try {
      let candidates = [];

      // 검색어 결정 로직
      const searchKeyword = manualLocation
        ? `${manualLocation} ${selectedCategory}`.trim()
        : selectedCategory;

      const requestParams = { keyword: searchKeyword, page: 1 };

      // 수동 입력 없을 때만 GPS 사용
      if (!manualLocation && myLoc) {
        requestParams.x = myLoc.x;
        requestParams.y = myLoc.y;
        requestParams.radius = 1000;
      }

      // 1. 맛집 긁어오기 (최대 3페이지)
      for (let page = 1; page <= 3; page++) {
        requestParams.page = page;
        const response = await axios.get(`${apiUrl}/api/food/search`, { params: requestParams });
        if (response.data && response.data.length > 0) {
          candidates = [...candidates, ...response.data];
        } else {
          break;
        }
      }

      if (candidates.length === 0) {
        setIsSpinning(false);
        setStatusMessage(manualLocation ? `"${manualLocation}" 근처에 식당이 없어요 ㅠㅠ` : "주변에 식당이 없어요 ㅠㅠ");
        return;
      }

      // 2. 태그 필터링
      if (selectedTag) {
        setStatusMessage(`"${selectedTag}" 태그 확인 중... 🧐`);
        const candidateIds = candidates.map(c => c.id);
        const filterRes = await axios.post(`${apiUrl}/api/wiki/filter-by-tag`, {
          restaurantIds: candidateIds,
          targetTag: selectedTag
        });
        const validIds = filterRes.data.map(r => r.id); // 서버 응답 구조에 따라 수정 (id 리스트만 필요하면 map 안해도 됨, 아까 서버는 객체 리스트 반환함)

        // 주의: 아까 서버 코드를 객체 리스트 반환으로 바꿨으므로 id만 추출해서 비교해야 함
        // 만약 서버가 id 리스트만 주면 그대로 쓰면 됨. 여기선 안전하게 id 추출 방식 가정
        const filteredCandidates = candidates.filter(c => validIds.some(v => v === c.id || v.id === c.id));

        if (filteredCandidates.length === 0) {
          setIsSpinning(false);
          setStatusMessage(`조건에 맞는 식당이 없어요 😭\n(태그: ${selectedTag})`);
          return;
        }
        candidates = filteredCandidates;
      }

      // 3. 룰렛 애니메이션
      setStatusMessage(`후보 ${candidates.length}개 중에서 고르는 중... 🎲`);
      let count = 0;
      intervalRef.current = setInterval(() => {
        const randomIdx = Math.floor(Math.random() * candidates.length);
        setDisplayContent(candidates[randomIdx].place_name);
        count++;
      }, 50);

      // 4. 결과 발표
      setTimeout(() => {
        clearInterval(intervalRef.current);
        const finalIdx = Math.floor(Math.random() * candidates.length);
        const winner = candidates[finalIdx];
        setResult(winner);
        setDisplayContent(winner.place_name);
        setIsSpinning(false);
        setStatusMessage("🎉 결정되었습니다!");
      }, 2000);

    } catch (error) {
      console.error(error);
      setIsSpinning(false);
      clearInterval(intervalRef.current);
      setStatusMessage("오류가 발생했습니다.");
    }
  };

  return (
    <div className="page-container">
      {/* <button onClick={() => navigate(-1)} className="btn" style={{ marginBottom: '10px', padding: '0', color: 'var(--text-sub)' }}>← 뒤로 가기</button> */}
      <h1 className="title text-center">🎰 오늘 뭐 먹지?</h1>

      {/* [배치 1] 상단 광고: 지도 시작 전 노출 */}
      {/* <AdSenseUnit isApp={isApp} slotId="상단_광고_ID" /> */}

      {/* ★ 설정 패널 (Card UI 적용) */}
      <div className="wiki-editor-card" style={{ marginBottom: '30px' }}>

        {/* 1. 위치 입력 */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>📍 위치</p>
          <input
            className="wiki-textarea" // 스타일 재활용 (배경 투명 등)
            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', height: 'auto', minHeight: 'auto', width: '96%' }}
            type="text"
            placeholder="예: 강남역, 홍대, 부산역"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
          />
        </div>

        {/* 2. 음식 종류 */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>🍽️ 종류 선택</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.code)}
                className={`tag-btn ${selectedCategory === cat.code ? 'active' : ''}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 분위기 태그 */}
        <div>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>✨ 분위기 (선택)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={() => setSelectedTag(null)}
              className={`tag-btn ${selectedTag === null ? 'active' : ''}`}
              style={selectedTag === null ? { background: '#666', borderColor: '#666' } : {}}
            >
              상관없음
            </button>
            {PREDEFINED_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 룰렛 디스플레이 */}
      <div style={{
        width: '100%', height: '180px', backgroundColor: '#FFF3E0', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        border: '4px solid var(--primary)', marginBottom: '30px', overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#333', padding: '0 20px', wordBreak: 'keep-all' }}>
          {displayContent}
        </div>
        <div style={{ fontSize: '14px', color: '#E65100', marginTop: '10px', fontWeight: 'bold' }}>
          {statusMessage}
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      {!result ? (
        <button
          onClick={handleStart}
          className="btn-primary"
          disabled={isSpinning}
          style={{
            height: '60px', fontSize: '20px',
            boxShadow: '0 4px 15px rgba(255, 87, 34, 0.4)',
            opacity: isSpinning ? 0.7 : 1
          }}
        >
          {isSpinning ? "🎲 돌아가는 중..." : "🎰 룰렛 돌리기!"}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            style={{ backgroundColor: '#4CAF50', flex: 1 }}
            onClick={() => navigate(`/wiki/${result.id}`, {
              state: { name: result.place_name, address: result.road_address_name, x: result.x, y: result.y }
            })}
          >
            📄 리뷰 보기
          </button>
          <button
            className="btn-primary"
            style={{ backgroundColor: '#2196F3', flex: 1 }}
            onClick={() => { setResult(null); setDisplayContent("❓"); setStatusMessage("한 번 더?"); }}
          >
            🔄 다시 하기
          </button>
        </div>
      )}

      {/* [배치 2] 중간 광고: 지도와 룰렛 버튼 사이 */}
      {/* <AdSenseUnit isApp={isApp} slotId="중간_광고_ID" /> */}

    </div>
  );
}

export default RoulettePage;