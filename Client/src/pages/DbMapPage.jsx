import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from '../components/AdSenseUnit';

// ★ [추가 1] 태그 목록 정의
const PREDEFINED_TAGS = [
    "🍚 혼밥가능", "👩‍❤️‍👨 데이트", "🍺 회식장소", "💸 가성비갑",
    "😋 JMT(존맛)", "✨ 분위기맛집", "😊 친절해요",
    "🚗 주차가능", "🏞️ 뷰맛집", "🤫 조용해요"
];

function DbMapPage() {
    const navigate = useNavigate();
    const mapContainer = useRef(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    // 기본값: 서울 시청
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };

    const [myLocation, setMyLocation] = useState(defaultLocation);
    const [mapInstance, setMapInstance] = useState(null);

    // ★ [수정] 데이터 상태 분리
    const [dbRestaurants, setDbRestaurants] = useState([]); // 서버에서 가져온 원본 전체 데이터
    const [filteredRestaurants, setFilteredRestaurants] = useState([]); // 실제 지도에 뿌려질 필터링된 데이터

    // ★ [추가 2] 태그 선택 상태
    const [selectedTag, setSelectedTag] = useState(null);

    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApp, setIsApp] = useState(false);
    const [isFindingLocation, setIsFindingLocation] = useState(false);

    // ★ [추가 3] 마커 관리를 위한 Ref (필터링 시 기존 마커 지우기 위해 필요)
    const markersRef = useRef([]);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) setIsApp(true);
    }, []);

    // 1. 내 위치 가져오기
    const findMyLocation = () => {
        if (!navigator.geolocation) {
            alert("위치 정보를 지원하지 않는 브라우저입니다.");
            return;
        }
        setIsFindingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMyLocation(newPos);
                if (mapInstance && window.kakao) {
                    const moveLatLon = new window.kakao.maps.LatLng(newPos.lat, newPos.lng);
                    mapInstance.panTo(moveLatLon);
                }
                setIsFindingLocation(false);
            },
            (err) => {
                console.error("위치 파악 실패:", err);
                setIsFindingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    // 2. 초기 데이터 로딩
    useEffect(() => {
        findMyLocation();
        const fetchDbRestaurants = async () => {
            try {
                const res = await axios.get(`${apiUrl}/api/map`);
                setDbRestaurants(res.data);
                setFilteredRestaurants(res.data); // 초기에는 전체 데이터를 보여줌
            } catch (e) { console.error("DB 로딩 실패", e); }
            finally { setLoading(false); }
        };
        fetchDbRestaurants();
    }, []);

    // 4. 태그 필터링 로직 (수정됨)
    const handleTagClick = async (tag) => {
        if (tag === null || selectedTag === tag) {
            setSelectedTag(null);
            setFilteredRestaurants(dbRestaurants); // 원본 데이터로 복구
            return; 
        }

        setSelectedTag(tag);
        
        try {
            const allIds = dbRestaurants.map(r => r.id);
            const res = await axios.post(`${apiUrl}/api/wiki/filter-by-tag`, {
                restaurantIds: allIds,
                targetTag: tag
            });

            const validIds = res.data.map(r => r.id);
            const newFiltered = dbRestaurants.filter(r => validIds.includes(r.id));
            setFilteredRestaurants(newFiltered);

            if (newFiltered.length === 0) {
                alert(`'${tag}' 태그가 달린 식당이 없습니다.`);
            }
        } catch (e) {
            console.error("태그 필터링 실패", e);
        }
    };

    // ★ [핵심 수정] 3. 지도 그리기 (재시도 로직 추가)
    useEffect(() => {
        // 데이터 로딩 중이거나 이미 지도가 있으면 패스
        if (loading || mapInstance) return;

        // 지도를 그리는 함수 정의
        const initMap = () => {
            // mapContainer가 아직 렌더링 안 됐거나, kakao 스크립트가 없으면 재시도
            if (!mapContainer.current || !window.kakao || !window.kakao.maps) {
                // 0.1초 뒤에 다시 시도 (스크립트 로딩 대기)
                setTimeout(initMap, 100);
                return;
            }

            window.kakao.maps.load(() => {
                const options = {
                    center: new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng),
                    level: 5
                };
                const map = new window.kakao.maps.Map(mapContainer.current, options);
                map.setZoomable(true);
                map.setDraggable(true);
                setMapInstance(map);

                const zoomControl = new window.kakao.maps.ZoomControl();
                map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
            });
        };

        initMap(); // 지도 그리기 시작

    }, [loading]); // loading이 false가 될 때 실행

    // 4. 마커 찍기 (데이터가 바뀌면 기존 마커 지우고 다시 찍기)
    useEffect(() => {
        if (!mapInstance || !window.kakao) return;

        // (1) 기존 마커 싹 지우기
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
        const imageSize = new window.kakao.maps.Size(24, 35);
        const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);

        // (2) filteredRestaurants 기준으로 마커 생성
        filteredRestaurants.forEach((r) => {
            const markerPosition = new window.kakao.maps.LatLng(parseFloat(r.y), parseFloat(r.x));
            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                title: r.name,
                image: markerImage,
                clickable: true
            });
            marker.setMap(mapInstance);

            markersRef.current.push(marker);

            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedRestaurant(r);
                mapInstance.panTo(markerPosition);
            });
        });

    }, [mapInstance, filteredRestaurants]);

    return (
        <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0, backgroundColor: '#f9f9f9' }}>
            {/* 1. 상단 타이틀 */}
            <div style={{ padding: '15px 20px 5px 20px', backgroundColor: 'white', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <h1 className="title" style={{ margin: 0, fontSize: '18px' }}>🗺️ 대동맛지도</h1>
                <p style={{ margin: '5px 0 10px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
                    {selectedTag ? `'${selectedTag}' 검색 결과: ${filteredRestaurants.length}개` : `유저들이 등록한 맛집 ${dbRestaurants.length}곳`}
                </p>

                {/* 태그바 */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    paddingBottom: '10px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }} className="hide-scrollbar">
                    <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

                    <button
                        onClick={() => handleTagClick(null)}
                        style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #ddd',
                            backgroundColor: selectedTag === null ? '#333' : 'white',
                            color: selectedTag === null ? 'white' : '#555',
                            flexShrink: 0
                        }}
                    >
                        전체
                    </button>
                    {PREDEFINED_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            style={{
                                padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #ddd',
                                backgroundColor: selectedTag === tag ? '#FF5722' : 'white',
                                color: selectedTag === tag ? 'white' : '#555',
                                fontWeight: selectedTag === tag ? 'bold' : 'normal',
                                flexShrink: 0
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. 지도 영역 */}
            <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 20px 20px 20px',
                minHeight: '400px' // ★ [핵심] Flex가 망가져도 최소 400px은 확보해라!
            }}>
                <div style={{
                    flex: 1,
                    width: '100%',
                    position: 'relative',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    border: '1px solid #f0f0f0',
                    minHeight: '100%' // ★ 내부 컨테이너도 부모 높이를 꽉 채우도록
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            데이터 로딩 중... ⏳
                        </div>
                    ) : (
                        // ★ [중요] mapContainer ref가 달린 div는 무조건 렌더링 되어야 함
                        <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>
                    )}

                    {/* 내 위치 찾기 버튼 */}
                    <button
                        onClick={findMyLocation}
                        disabled={isFindingLocation}
                        style={{
                            position: 'absolute', bottom: '50px', right: '35px', zIndex: 20,
                            backgroundColor: 'white', border: '1px solid #eee', borderRadius: '50%',
                            width: '45px', height: '45px', fontSize: '22px', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {isFindingLocation ?
                            <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear', fontSize: '16px' }}>⏳</span>
                            : '🎯'
                        }
                    </button>
                </div>
            </div>

            {/* 하단 광고 */}
            <div style={{ padding: '10px 0', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                <AdSenseUnit isApp={isApp} slotId="1571207047" />
            </div>

            {/* 식당 선택 모달 */}
            {selectedRestaurant && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedRestaurant(null)}>
                    <div style={{ width: '100%', maxWidth: '320px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', animation: 'pop 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{selectedRestaurant.name}</h3>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>{selectedRestaurant.address}</p>
                        {selectedRestaurant.ackCount > 0 && (
                            <div style={{ marginBottom: '15px', color: '#E65100', fontWeight: 'bold' }}>
                                🔥 {selectedRestaurant.ackCount}명이 인정함
                            </div>
                        )}
                        <button onClick={() => window.open(`https://place.map.kakao.com/${selectedRestaurant.id}`, '_blank')} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', cursor: 'pointer' }}>💛 카카오 지도 보기</button>
                        <button onClick={() => navigate(`/wiki/${selectedRestaurant.id}`, { state: selectedRestaurant })} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', background: 'white', color: '#555', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>📝 MealWiki 리뷰 보기</button>
                        <button onClick={() => setSelectedRestaurant(null)} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#999', fontSize: '13px', textDecoration: 'underline' }}>닫기</button>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default DbMapPage;