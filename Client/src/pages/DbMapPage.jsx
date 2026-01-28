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
    const [mapInstance, setMapInstance] = useState(null); // 지도 객체 저장
    const [dbRestaurants, setDbRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApp, setIsApp] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) setIsApp(true);
    }, []);

    // 1. 내 위치 가져오기 함수 (버튼 클릭 시에도 사용)
    const findMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setMyLocation(newPos);
                    
                    // 지도가 이미 로딩되어 있다면 부드럽게 이동
                    if (mapInstance && window.kakao) {
                        const moveLatLon = new window.kakao.maps.LatLng(newPos.lat, newPos.lng);
                        mapInstance.panTo(moveLatLon);
                        
                        // 내 위치 마커 표시 (선택 사항)
                        // 기존 마커들을 관리하려면 별도 state가 필요하지만, 
                        // 여기서는 간단히 지도 중심 이동에 집중합니다.
                    }
                },
                (err) => {
                    console.error("위치 파악 실패:", err);
                    alert("위치 정보를 가져올 수 없습니다. 브라우저 권한을 확인해주세요.");
                },
                { enableHighAccuracy: true } // 정확도 높임
            );
        } else {
            alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
        }
    };

    // 2. 초기 데이터 로딩 (DB + 위치)
    useEffect(() => {
        // (A) 시작하자마자 위치 한 번 찾기 시도
        findMyLocation();

        // (B) DB 식당 데이터 가져오기
        const fetchDbRestaurants = async () => {
            try {
                const res = await axios.get(`${apiUrl}/api/map`); // MapController 호출
                setDbRestaurants(res.data);
            } catch (e) { console.error("DB 로딩 실패", e); } 
            finally { setLoading(false); }
        };
        fetchDbRestaurants();
    }, []);

    // 3. 지도 그리기 (최초 1회 실행)
    useEffect(() => {
        if (loading || !window.kakao || mapInstance) return; // 이미 지도가 있으면 패스

        window.kakao.maps.load(() => {
            const options = {
                center: new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng),
                level: 5
            };
            const map = new window.kakao.maps.Map(mapContainer.current, options);
            setMapInstance(map); // 지도 객체 저장 (나중에 이동시키기 위해)

            // 줌 컨트롤 추가
            const zoomControl = new window.kakao.maps.ZoomControl();
            map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
        });
    }, [loading]); // loading이 끝나면 지도 생성

    // 4. DB 데이터가 들어오거나 지도가 생성되면 마커 찍기
    useEffect(() => {
        if (!mapInstance || dbRestaurants.length === 0 || !window.kakao) return;

        const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
        const imageSize = new window.kakao.maps.Size(24, 35); 
        const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize); 

        // 기존 마커 클러스터링 등을 안 쓰고 단순 추가 방식 (MVP)
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
                // 마커 클릭 시 해당 위치로 지도 중심 이동 (옵션)
                mapInstance.panTo(markerPosition);
            });
        });
    }, [mapInstance, dbRestaurants]);

    return (
        <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', background: 'white', zIndex: 10 }}>
                <h1 className="title" style={{ margin: 0, fontSize: '18px' }}>🗺️ 찐맛집</h1>
                <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#888' }}>
                    유저들이 직접 등록한 {dbRestaurants.length}개의 맛집
                </p>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {loading ? (
                    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%'}}>
                        데이터 로딩 중... ⏳
                    </div>
                ) : (
                    <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>
                )}

                {/* ★ 내 위치 찾기 버튼 (플로팅) */}
                <button 
                    onClick={findMyLocation}
                    style={{
                        position: 'absolute', bottom: '100px', right: '20px', zIndex: 20,
                        backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '50%',
                        width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="내 위치로 이동"
                >
                    🎯
                </button>

                {/* 하단 광고 */}
                <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', zIndex: 20, padding: '0 20px' }}>
                    <AdSenseUnit isApp={isApp} slotId="1188063662" />
                </div>
            </div>

            {/* 식당 선택 모달 */}
            {selectedRestaurant && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedRestaurant(null)}>
                    <div style={{ width: '100%', maxWidth: '320px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', animation: 'pop 0.3s ease' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
    );
}

export default DbMapPage;