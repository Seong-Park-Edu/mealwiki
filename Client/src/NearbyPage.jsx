import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from './hooks/useGeolocation';
import KakaoMap from './components/KakaoMap';
import AdSenseUnit from './components/AdSenseUnit';
import axios from 'axios';

// ★ [추가 1] 음식 카테고리 목록
const FOOD_CATEGORIES = [
    { name: "전체", code: "" },
    { name: "한식", code: "한식" },
    { name: "중식", code: "중식" },
    { name: "일식", code: "일식" },
    { name: "양식", code: "양식" },
    { name: "치킨", code: "치킨" },
    { name: "피자", code: "피자" },
    { name: "카페", code: "카페" },
    { name: "디저트", code: "디저트" },
];

function NearbyPage() {
    const navigate = useNavigate();
    const myLoc = useGeolocation();

    const [places, setPlaces] = useState([]);
    const [targetLocation, setTargetLocation] = useState(null);
    const [selectedPlace, setSelectedPlace] = useState(null);

    // ★ [추가 2] 카테고리 선택 상태
    const [selectedCategory, setSelectedCategory] = useState("");

    const [showRoulette, setShowRoulette] = useState(false);
    const [rouletteText, setRouletteText] = useState("❓");
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const intervalRef = useRef(null);

    // 마지막 검색 중심 좌표 저장 (카테고리 바꿀 때 이 위치 기준 검색)
    const lastCenterRef = useRef(null);

    // 앱 접속 여부 판단
    const [isApp, setIsApp] = useState(false);
    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
            setIsApp(true);
        }
    }, []);

    // ★ [수정] 맛집 검색 함수 (카테고리 인자 추가)
    const searchPlaces = (lat, lng, category = selectedCategory) => {
        if (!window.kakao) return;

        window.kakao.maps.load(() => {
            if (!window.kakao.maps.services) return;

            const ps = new window.kakao.maps.services.Places();
            const searchOptions = {
                location: new window.kakao.maps.LatLng(lat, lng),
                radius: 1000,
                sort: window.kakao.maps.services.SortBy.DISTANCE
            };

            // 검색 시작 전 중심 좌표 저장
            lastCenterRef.current = { lat, lng };

            setPlaces([]); // 기존 마커 초기화

            const placesCallback = (data, status, pagination) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    setPlaces(prev => [...prev, ...data]);
                    if (pagination.hasNextPage && pagination.current < 3) {
                        pagination.nextPage();
                    }
                } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                    // 검색 결과가 없을 때 (조용히 넘어감 or 처리)
                    // setPlaces([]); // 이미 초기화 했으므로 생략 가능
                }
            };

            // ★ [핵심 로직] 카테고리 유무에 따라 검색 방식 분기
            if (category) {
                // 특정 카테고리 선택 시: 키워드 검색 (예: 내 위치 주변 '한식')
                ps.keywordSearch(category, placesCallback, searchOptions);
            } else {
                // 전체 선택 시: 카테고리 검색 (FD6 = 음식점)
                ps.categorySearch('FD6', placesCallback, searchOptions);
            }
        });
    };

    // 1. 내 위치 잡히면 초기 검색
    useEffect(() => {
        if (myLoc.loaded) {
            searchPlaces(myLoc.lat, myLoc.lng, selectedCategory);
        }
    }, [myLoc.loaded]); // 초기 로딩 시에만

    // 2. 지도 움직임 멈추면 재검색 (현재 선택된 카테고리 유지)
    const handleMapIdle = (newLat, newLng) => {
        if (isSpinning || showRoulette) return;
        searchPlaces(newLat, newLng, selectedCategory);
    };

    // ★ [추가 3] 카테고리 변경 핸들러
    const handleCategoryChange = (code) => {
        setSelectedCategory(code);
        
        // 현재 지도의 중심 기준으로 즉시 재검색
        if (lastCenterRef.current) {
            searchPlaces(lastCenterRef.current.lat, lastCenterRef.current.lng, code);
        } else if (myLoc.loaded) {
            searchPlaces(myLoc.lat, myLoc.lng, code);
        }
    };

    const handleMarkerClick = (place) => {
        setSelectedPlace(place);
    };

    // 룰렛 로직
    const startRoulette = () => {
        if (places.length === 0) return alert("주변에 식당이 없어요 ㅠㅠ");

        setShowRoulette(true);
        setIsSpinning(true);
        setWinner(null);
        setTargetLocation(null);
        setRouletteText("🎲");

        intervalRef.current = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * places.length);
            setRouletteText(places[randomIdx].place_name);
        }, 50);

        setTimeout(async () => {
            clearInterval(intervalRef.current);
            const finalIdx = Math.floor(Math.random() * places.length);
            const selectedPlace = places[finalIdx];

            try {
                const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
                await axios.post(
                    `${serverUrl}/api/Recommend/log`,
                    {
                        restaurantId: selectedPlace.id,
                        name: selectedPlace.place_name,
                        address: selectedPlace.road_address_name || selectedPlace.address_name,
                        x: selectedPlace.x,
                        y: selectedPlace.y
                    },
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } catch (e) {
                console.error("추천 로그 기록 실패", e);
            }

            setWinner(selectedPlace);
            setRouletteText(selectedPlace.place_name);
            setIsSpinning(false);
            setTargetLocation({ lat: selectedPlace.y, lng: selectedPlace.x });
        }, 2000);
    };

    const closeRoulette = () => {
        if (isSpinning) return;
        setShowRoulette(false);
        setWinner(null);
        setTargetLocation(null);
    };

    const currentCenter = targetLocation || myLoc;

    return (
        <div className="page-container">
            <h1 className="title text-center">📍 내 주변 맛집</h1>

            {/* ★ [추가 4] 가로 스크롤 카테고리바 (지도 바로 위) */}
            <div style={{ 
                marginBottom: '10px', 
                overflowX: 'auto', 
                whiteSpace: 'nowrap', 
                paddingBottom: '5px',
                display: 'flex',
                gap: '8px'
            }} className="hide-scrollbar">
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                
                {FOOD_CATEGORIES.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => handleCategoryChange(cat.code)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid #ddd',
                            fontSize: '14px',
                            backgroundColor: selectedCategory === cat.code ? '#FF5722' : 'white',
                            color: selectedCategory === cat.code ? 'white' : '#555',
                            fontWeight: selectedCategory === cat.code ? 'bold' : 'normal',
                            cursor: 'pointer',
                            flexShrink: 0, // 버튼 찌그러짐 방지
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div style={{ width: '100%', height: '400px', position: 'relative' }}>
                {!myLoc.loaded ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: '#f0f0f0' }}>
                        📡 위치 찾는 중...
                    </div>
                ) : (
                    <KakaoMap
                        center={currentCenter}
                        markers={places}
                        onMarkerClick={handleMarkerClick}
                        onMapIdle={handleMapIdle}
                    />
                )}

                {!showRoulette && places.length >= 0 && (
                    <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10, fontSize: '12px', fontWeight: 'bold', color: '#555', whiteSpace: 'nowrap' }}>
                        {selectedCategory ? `'${selectedCategory}'` : '전체'} 검색 결과: {places.length}개 🍽️
                    </div>
                )}
            </div>

            {/* 마커 선택 모달 */}
            {selectedPlace && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }} onClick={() => setSelectedPlace(null)}>

                    <div style={{
                        width: '100%', maxWidth: '320px', backgroundColor: 'white',
                        borderRadius: '16px', padding: '24px', textAlign: 'center'
                    }} onClick={(e) => e.stopPropagation()}>

                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{selectedPlace.place_name}</h3>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                            어디로 이동할까요?
                        </p>

                        <button
                            onClick={() => window.open(`https://place.map.kakao.com/${selectedPlace.id}`, '_blank')}
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
                            onClick={() => navigate(`/wiki/${selectedPlace.id}`, { state: { ...selectedPlace } })}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '10px',
                                border: '1px solid #ddd', background: 'white', color: '#555',
                                fontWeight: '500', fontSize: '14px', cursor: 'pointer'
                            }}
                        >
                            📝 MealWiki 상세 정보
                        </button>

                        <button
                            onClick={() => setSelectedPlace(null)}
                            style={{ marginTop: '15px', background: 'none', border: 'none', color: '#999', fontSize: '13px', textDecoration: 'underline' }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    {selectedCategory ? `${selectedCategory} 중에서 못 고르겠다면?` : '너무 많아서 못 고르겠다면?'}
                </p>
                <button
                    onClick={startRoulette}
                    className="btn-primary"
                    style={{
                        background: 'linear-gradient(45deg, #FF9800, #FF5722)',
                        boxShadow: '0 4px 15px rgba(255, 87, 34, 0.4)',
                        fontSize: '18px', padding: '15px 30px', width: '100%'
                    }}
                >
                    🎲 이 중에서 랜덤 선택!
                </button>
            </div>

            {/* 리스트 영역 */}
            <div style={{ marginTop: '30px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', paddingLeft: '5px' }}>
                    📋 주변 {selectedCategory || '식당'} 목록 ({places.length})
                </h2>

                {places.map((place, index) => (
                    <div key={place.id}>
                        <div
                            className="restaurant-card"
                            onClick={() => handleMarkerClick(place)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                                    {place.place_name}
                                </h3>
                                <span style={{ color: '#ccc' }}>›</span>
                            </div>
                            <div className="sub-text">📍 {place.road_address_name || place.address_name}</div>
                            <div className="category-badge">
                                {place.category_name ? place.category_name.split('>').pop().trim() : '맛집'}
                            </div>
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

            {/* 중간 광고 */}
            <AdSenseUnit isApp={isApp} slotId="1571207047" />

            {/* 룰렛 모달 */}
            {showRoulette && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={closeRoulette}>

                    <div style={{
                        width: '320px', backgroundColor: 'white', borderRadius: '24px', padding: '30px',
                        textAlign: 'center', animation: 'pop 0.3s ease', position: 'relative',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>오늘의 운명적인 맛집은?</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px', minHeight: '40px' }}>
                            {rouletteText}
                        </div>

                        {winner && (
                            <>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '25px' }}>
                                    {winner.road_address_name || winner.address_name}
                                </div>

                                <button
                                    onClick={() => window.open(`https://place.map.kakao.com/${winner.id}`, '_blank')}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '12px',
                                        border: 'none', background: '#FEE500', color: '#3C1E1E',
                                        fontWeight: 'bold', fontSize: '15px', marginBottom: '10px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    💛 카카오 지도 리뷰 보기
                                </button>

                                <button
                                    onClick={() => navigate(`/wiki/${winner.id}`, { state: { name: winner.place_name, ...winner } })}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '12px',
                                        border: '1px solid #eee', background: '#f9f9f9', color: '#666',
                                        fontWeight: '500', fontSize: '14px', marginBottom: '15px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📝 MealWiki 상세 정보
                                </button>
                            </>
                        )}

                        <button
                            onClick={closeRoulette}
                            style={{ background: 'none', border: 'none', color: '#bbb', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NearbyPage;