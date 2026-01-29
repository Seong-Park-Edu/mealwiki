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
        // ★ [수정 포인트] 
        // 1. '전체' 버튼(null)을 눌렀거나
        // 2. 이미 선택된 태그를 다시 눌러서 취소하는 경우
        if (tag === null || selectedTag === tag) {
            setSelectedTag(null);
            setFilteredRestaurants(dbRestaurants); // 원본 데이터로 복구
            return; // ★ 여기서 함수를 끝내서 API 요청을 막습니다!
        }

        // 3. 새로운 태그 선택 시 로직 시작
        setSelectedTag(tag);

        try {
            const allIds = dbRestaurants.map(r => r.id);

            // 서버에 필터링 요청 (이제 tag가 null일 때 여기로 오지 않으므로 에러 안 남)
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
            // 에러가 나도 사용자 경험을 위해 전체 목록을 보여주거나 유지
            // setFilteredRestaurants(dbRestaurants); 
        }
    };

    // 3. 지도 그리기 (초기 1회)
    useEffect(() => {
        if (loading || !window.kakao || mapInstance) return;

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
    }, [loading]);

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

            // 생성된 마커를 ref에 저장 (나중에 지우기 위해)
            markersRef.current.push(marker);

            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedRestaurant(r);
                mapInstance.panTo(markerPosition);
            });
        });

    }, [mapInstance, filteredRestaurants]); // ★ 의존성이 filteredRestaurants로 변경됨

    return (
        <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0, backgroundColor: '#f9f9f9' }}>
            {/* 1. 상단 타이틀 */}
            <div style={{ padding: '15px 20px 5px 20px', backgroundColor: 'white', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <h1 className="title" style={{ margin: 0, fontSize: '18px' }}>🗺️ 대동맛지도</h1>
                <p style={{ margin: '5px 0 10px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
                    {selectedTag ? `'${selectedTag}' 검색 결과: ${filteredRestaurants.length}개` : `유저들이 등록한 맛집 ${dbRestaurants.length}곳`}
                </p>

                {/* ★ [추가 5] 가로 스크롤 태그 필터 바 */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    paddingBottom: '10px',
                    scrollbarWidth: 'none', // 파이어폭스 스크롤바 숨김
                    msOverflowStyle: 'none' // IE 스크롤바 숨김
                }} className="hide-scrollbar">
                    {/* 스크롤바 숨기기 스타일 */}
                    <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

                    <button
                        onClick={() => handleTagClick(null)}
                        style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #ddd',
                            backgroundColor: selectedTag === null ? '#333' : 'white',
                            color: selectedTag === null ? 'white' : '#555',
                            flexShrink: 0 // 버튼 찌그러짐 방지
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
                // ★ [핵심 1] 여기에 여백(padding)을 줍니다. (상단 0, 좌우하단 20px)
                padding: '20px 20px 20px 20px'
            }}>
                <div style={{
                    flex: 1,
                    width: '100%',
                    position: 'relative',
                    backgroundColor: 'white',
                    // ★ [핵심 2] 모서리를 둥글게 깎고 그림자를 줍니다.
                    borderRadius: '20px',
                    overflow: 'hidden', // 지도가 둥근 모서리 밖으로 튀어나가지 않게 자름
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)', // 살짝 그림자 추가
                    border: '1px solid #f0f0f0' // 얇은 테두리
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            데이터 로딩 중... ⏳
                        </div>
                    ) : (
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

            {/* 하단 광고 */}
            <div style={{ padding: '10px 0', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                <AdSenseUnit isApp={isApp} slotId="1188063662" />
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default DbMapPage;