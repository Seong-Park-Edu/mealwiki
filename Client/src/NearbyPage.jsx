import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function NearbyPage() {
    const mapContainer = useRef(null);
    const navigate = useNavigate();

    // 내 진짜 위치 (GPS)
    const [myLoc, setMyLoc] = useState({ lat: 37.5665, lng: 126.9780 });
    const [loading, setLoading] = useState(true);

    // ★ [추가] 지도에 표시된 식당 리스트 & 지도 객체 저장
    const [places, setPlaces] = useState([]);
    const mapInstance = useRef(null); // 지도 조작용(이동, 줌)
    const markersRef = useRef([]);

    // ★ [추가] 룰렛 관련 State
    const [showRoulette, setShowRoulette] = useState(false);
    const [rouletteText, setRouletteText] = useState("❓");
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);

    // 1. GPS로 내 위치 한 번만 딱 잡기
    useEffect(() => {
        const timeoutId = setTimeout(() => setLoading(false), 5000);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMyLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
                    setLoading(false); clearTimeout(timeoutId);
                },
                (err) => { console.error(err); setLoading(false); clearTimeout(timeoutId); }
            );
        } else { setLoading(false); clearTimeout(timeoutId); }
    }, []);

    // 2. 지도 로드 및 이벤트 연결
    useEffect(() => {
        if (loading) return;
        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
            const container = mapContainer.current;
            if (!container) return;
            container.innerHTML = '';

            const options = { center: new window.kakao.maps.LatLng(myLoc.lat, myLoc.lng), level: 5 };
            const map = new window.kakao.maps.Map(container, options);
            mapInstance.current = map; // ★ 지도 객체 저장 (나중에 룰렛 이동용)

            // (1) 내 위치 파란 마커
            const myMarkerPosition = new window.kakao.maps.LatLng(myLoc.lat, myLoc.lng);
            const myMarker = new window.kakao.maps.Marker({ position: myMarkerPosition, map: map, title: '내 위치' });
            const infowindow = new window.kakao.maps.InfoWindow({ position: myMarkerPosition, content: '<div style="padding:5px; font-size:12px; color:blue; font-weight:bold;">🚩 내 위치</div>' });
            infowindow.open(map, myMarker);

            // (2) 맛집 검색
            const ps = new window.kakao.maps.services.Places();
            const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png";
            const imageSize = new window.kakao.maps.Size(34, 39);
            const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);

            const searchPlaces = (centerLat, centerLng) => {
                // 1. 기존 마커 지우기
                removeMarkers();
                // 2. ★ 기존 룰렛 후보 리스트 초기화 (새로 검색하니까)
                setPlaces([]);

                const searchOptions = {
                    location: new window.kakao.maps.LatLng(centerLat, centerLng),
                    radius: 1000, // 반경 1km
                    sort: window.kakao.maps.services.SortBy.DISTANCE
                };

                // 카카오 API 요청
                ps.categorySearch('FD6', (data, status, pagination) => {
                    if (status === window.kakao.maps.services.Status.OK) {

                        // ★ 3. 데이터 누적하기 (기존 것 + 새로 온 것)
                        setPlaces(prev => [...prev, ...data]);

                        // 마커 그리기
                        for (let i = 0; i < data.length; i++) {
                            displayMarker(data[i]);
                        }

                        // ★ 4. 다음 페이지가 있으면(그리고 3페이지 이하라면) 더 가져와!
                        if (pagination.hasNextPage && pagination.current < 3) {
                            pagination.nextPage();
                        }
                    }
                }, searchOptions);
            };

            function displayMarker(place) {
                const marker = new window.kakao.maps.Marker({
                    map: map, position: new window.kakao.maps.LatLng(place.y, place.x), image: markerImage
                });
                markersRef.current.push(marker);

                window.kakao.maps.event.addListener(marker, 'click', function () {
                    if (window.confirm(`"${place.place_name}" 상세정보 볼래?`)) {
                        navigate(`/wiki/${place.id}`, { state: { name: place.place_name, address: place.road_address_name, x: place.x, y: place.y } });
                    }
                });
                const hoverWin = new window.kakao.maps.InfoWindow({ content: `<div style="padding:5px; font-size:12px;">${place.place_name}</div>` });
                window.kakao.maps.event.addListener(marker, 'mouseover', () => hoverWin.open(map, marker));
                window.kakao.maps.event.addListener(marker, 'mouseout', () => hoverWin.close());
            }

            function removeMarkers() {
                for (let i = 0; i < markersRef.current.length; i++) markersRef.current[i].setMap(null);
                markersRef.current = [];
            }

            // 최초 검색 및 드래그 재검색
            searchPlaces(myLoc.lat, myLoc.lng);
            window.kakao.maps.event.addListener(map, 'idle', function () {
                const center = map.getCenter();
                searchPlaces(center.getLat(), center.getLng());
            });
        });
    }, [loading, myLoc, navigate]);

    // ★ [핵심] 룰렛 돌리기 함수
    const startRoulette = () => {
        if (places.length === 0) return alert("주변에 식당이 없어요 ㅠㅠ 지도를 움직여보세요.");

        setShowRoulette(true);
        setIsSpinning(true);
        setWinner(null);
        setRouletteText("🎲");

        let count = 0;
        const interval = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * places.length);
            setRouletteText(places[randomIdx].place_name);
            count++;
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            const finalIdx = Math.floor(Math.random() * places.length);
            const selectedPlace = places[finalIdx];

            setWinner(selectedPlace);
            setRouletteText(selectedPlace.place_name);
            setIsSpinning(false);

            // ★ 지도 이동 효과 (해당 식당으로 줌인!)
            if (mapInstance.current) {
                const moveLatLon = new window.kakao.maps.LatLng(selectedPlace.y, selectedPlace.x);
                mapInstance.current.panTo(moveLatLon); // 부드럽게 이동
                // mapInstance.current.setLevel(3); // (선택사항) 확대하고 싶으면 주석 해제
            }
        }, 2000);
    };

    return (
        <div className="page-container">
            {/* <button onClick={() => navigate(-1)} className="btn" style={{ marginBottom: '10px', padding: '0', color: 'var(--text-sub)' }}>← 뒤로 가기</button> */}
            <h1 className="title text-center">📍 내 주변 맛집</h1>

            {/* 지도 영역 */}
            <div style={{
                width: 'calc(100% + 48px)', marginLeft: '-24px', // 꽉 찬 느낌
                height: '400px', position: 'relative', borderTop: '1px solid #eee', borderBottom: '1px solid #eee'
            }}>
                {loading && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20, background: 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>📡 찾는 중...</div>}
                <div ref={mapContainer} style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}></div>

                {/* 지도 위 안내 배너 */}
                {!showRoulette && (
                    <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10, fontSize: '12px', fontWeight: 'bold', color: '#555', whiteSpace: 'nowrap' }}>
                        현재 검색된 식당: {places.length}개 🍽️
                    </div>
                )}
            </div>

            {/* ★ 룰렛 버튼 영역 (지도 바로 아래) */}
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

            {/* ★ 룰렛 결과 모달 (Overlay) */}
            {showRoulette && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={() => !isSpinning && setShowRoulette(false)}>

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
                                    onClick={() => navigate(`/wiki/${winner.id}`, { state: { name: winner.place_name, address: winner.road_address_name, x: winner.x, y: winner.y } })}
                                    className="btn-primary"
                                    style={{ width: '100%', marginBottom: '10px' }}
                                >
                                    상세 정보 보기 👉
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setShowRoulette(false)}
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