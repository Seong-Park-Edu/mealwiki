import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from '../components/AdSenseUnit';

function DbMapPage() {
    const navigate = useNavigate();
    const mapContainer = useRef(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    // 기본값: 서울 시청
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };

    const [myLocation, setMyLocation] = useState(defaultLocation);
    const [mapInstance, setMapInstance] = useState(null);
    const [dbRestaurants, setDbRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApp, setIsApp] = useState(false);

    // ★ 추가: 위치 찾는 중 상태
    const [isFindingLocation, setIsFindingLocation] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) setIsApp(true);
    }, []);

    // 1. 내 위치 가져오기 함수 (반응성 개선)
    const findMyLocation = () => {
        if (!navigator.geolocation) {
            alert("위치 정보를 지원하지 않는 브라우저입니다.");
            return;
        }

        // ★ 로딩 시작 (버튼 아이콘 변경용)
        setIsFindingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMyLocation(newPos);

                if (mapInstance && window.kakao) {
                    const moveLatLon = new window.kakao.maps.LatLng(newPos.lat, newPos.lng);
                    mapInstance.panTo(moveLatLon); // 부드럽게 이동

                    // (선택) 내 위치에 마커 표시 로직을 여기에 추가할 수 있습니다.
                }
                setIsFindingLocation(false); // ★ 로딩 끝
            },
            (err) => {
                console.error("위치 파악 실패:", err);
                // alert("위치 정보를 가져오지 못했습니다. GPS 권한을 확인해주세요.");
                setIsFindingLocation(false); // ★ 로딩 끝 (에러 시)
            },
            { enableHighAccuracy: true, timeout: 5000 } // 5초 타임아웃
        );
    };

    // 2. 초기 데이터 로딩
    useEffect(() => {
        findMyLocation(); // 시작하자마자 위치 찾기 시도

        const fetchDbRestaurants = async () => {
            try {
                const res = await axios.get(`${apiUrl}/api/map`);
                setDbRestaurants(res.data);
            } catch (e) { console.error("DB 로딩 실패", e); }
            finally { setLoading(false); }
        };
        fetchDbRestaurants();
    }, []);

    // 3. 지도 그리기
    useEffect(() => {
        if (loading || !window.kakao || mapInstance) return;

        window.kakao.maps.load(() => {
            const options = {
                center: new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng),
                level: 5
            };
            const map = new window.kakao.maps.Map(mapContainer.current, options);

            // ★ [핵심] PC 마우스 휠 줌 허용 설정
            map.setZoomable(true);

            // ★ [핵심 2] 마우스 드래그 이동 허용 (이 줄을 추가하세요!)
            map.setDraggable(true);

            setMapInstance(map);

            // 줌 컨트롤 (우측)
            const zoomControl = new window.kakao.maps.ZoomControl();
            map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
        });
    }, [loading]);

    // 4. 마커 찍기
    useEffect(() => {
        if (!mapInstance || dbRestaurants.length === 0 || !window.kakao) return;

        const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
        const imageSize = new window.kakao.maps.Size(24, 35);
        const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);

        dbRestaurants.forEach((r) => {
            const markerPosition = new window.kakao.maps.LatLng(parseFloat(r.y), parseFloat(r.x));
            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                title: r.name,
                image: markerImage,
                clickable: true
            });
            marker.setMap(mapInstance);

            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedRestaurant(r);
                mapInstance.panTo(markerPosition);
            });
        });
    }, [mapInstance, dbRestaurants]);

    return (
        <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0, backgroundColor: '#f9f9f9' }}>
            {/* 1. 상단 타이틀 */}
            <div style={{ padding: '15px 20px', backgroundColor: 'white', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <h1 className="title" style={{ margin: 0, fontSize: '18px', textAlign: 'center' }}>🗺️ 대동맛지도</h1>
                <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#888', textAlign: 'center' }}>
                    유저들이 직접 등록한 {dbRestaurants.length}개의 맛집
                </p>
            </div>

            {/* 2. 지도 영역 (여백을 주는 바깥 틀) */}
            <div style={{ flex: 1, position: 'relative', padding: '15px', display: 'flex', flexDirection: 'column' }}>

                {/* 3. 실제 카드 (흰색 박스 + 그림자 + 둥근 모서리) */}
                <div style={{
                    flex: 1, // 부모 영역을 꽉 채우도록 설정
                    width: '100%',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    position: 'relative',
                    backgroundColor: 'white'
                }}>

                    {/* 지도 로딩 및 렌더링 */}
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
                            position: 'absolute', bottom: '120px', right: '15px', zIndex: 20,
                            backgroundColor: 'white', border: '1px solid #eee', borderRadius: '50%',
                            width: '45px', height: '45px', fontSize: '22px', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isFindingLocation ?
                            <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear', fontSize: '16px' }}>⏳</span>
                            : '🎯'
                        }
                    </button>

                    {/* 하단 광고 (위치 조정) */}
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        zIndex: 20,
                        padding: '0 10px 10px 10px',

                        // ★ [핵심 1] 이 영역은 터치 이벤트를 무시하고 통과시킵니다.
                        pointerEvents: 'none'
                    }}>
                        {/* ★ [핵심 2] 실제 광고는 클릭되어야 하므로 div로 감싸서 이벤트를 다시 살립니다. */}
                        <div style={{ pointerEvents: 'auto' }}>
                            <AdSenseUnit isApp={isApp} slotId="1188063662" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 식당 선택 모달 (기존 코드 유지) */}
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

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default DbMapPage;