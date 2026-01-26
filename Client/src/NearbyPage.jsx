import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from './hooks/useGeolocation';
import KakaoMap from './components/KakaoMap';
import AdSenseUnit from './components/AdSenseUnit';

function NearbyPage() {
    const navigate = useNavigate();
    const myLoc = useGeolocation();

    const [places, setPlaces] = useState([]);
    const [targetLocation, setTargetLocation] = useState(null);

    const [showRoulette, setShowRoulette] = useState(false);
    const [rouletteText, setRouletteText] = useState("❓");
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const intervalRef = useRef(null);

    // 앱 접속 여부 판단
    const [isApp, setIsApp] = useState(false);
    useEffect(() => {
        // 이름표(User-Agent)를 확인하여 앱 여부 판별
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
            setIsApp(true);
        }
    }, []);

    // ★ [핵심] 맛집 검색 함수 (안전하게 로드 후 실행)
    const searchPlaces = (lat, lng) => {
        if (!window.kakao) return;

        // load 콜백 안에서 services 라이브러리 사용
        window.kakao.maps.load(() => {
            if (!window.kakao.maps.services) return; // 방어 코드

            const ps = new window.kakao.maps.services.Places();
            const searchOptions = {
                location: new window.kakao.maps.LatLng(lat, lng),
                radius: 1000,
                sort: window.kakao.maps.services.SortBy.DISTANCE
            };

            setPlaces([]); // 기존 데이터 초기화

            ps.categorySearch('FD6', (data, status, pagination) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    setPlaces(prev => [...prev, ...data]);
                    if (pagination.hasNextPage && pagination.current < 3) {
                        pagination.nextPage();
                    }
                }
            }, searchOptions);
        });
    };

    // 내 위치 잡히면 검색 시작
    useEffect(() => {
        if (myLoc.loaded) {
            searchPlaces(myLoc.lat, myLoc.lng);
        }
    }, [myLoc.loaded]);

    // 지도 움직임 멈추면 재검색
    const handleMapIdle = (newLat, newLng) => {
        if (isSpinning || showRoulette) return;
        searchPlaces(newLat, newLng);
    };

    const handleMarkerClick = (place) => {
        if (window.confirm(`"${place.place_name}" 상세정보 볼래?`)) {
            navigate(`/wiki/${place.id}`, { state: { name: place.place_name, ...place } });
        }
    };

    // 룰렛 로직 (변경 없음)
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

        setTimeout(() => {
            clearInterval(intervalRef.current);
            const finalIdx = Math.floor(Math.random() * places.length);
            const selectedPlace = places[finalIdx];

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

                {!showRoulette && places.length > 0 && (
                    <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10, fontSize: '12px', fontWeight: 'bold', color: '#555', whiteSpace: 'nowrap' }}>
                        현재 검색된 식당: {places.length}개 🍽️
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>너무 많아서 못 고르겠다면?</p>
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

            {/* [배치 2] 중간 광고: 지도와 룰렛 버튼 사이 */}
            <AdSenseUnit isApp={isApp} slotId="1571207047" />

            {showRoulette && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={closeRoulette}>

                    <div style={{
                        width: '300px', backgroundColor: 'white', borderRadius: '20px', padding: '30px',
                        textAlign: 'center', animation: 'pop 0.3s ease', position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>

                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>오늘의 운명은?</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '20px', minHeight: '40px' }}>
                            {rouletteText}
                        </div>

                        {winner && (
                            <>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                                    {winner.road_address_name || winner.address_name}
                                </div>
                                <button
                                    onClick={() => navigate(`/wiki/${winner.id}`, { state: { name: winner.place_name, ...winner } })}
                                    className="btn-primary"
                                    style={{ width: '100%', marginBottom: '10px' }}
                                >
                                    상세 정보 보기 👉
                                </button>
                            </>
                        )}

                        <button
                            onClick={closeRoulette}
                            style={{ background: 'none', border: 'none', color: '#999', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
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