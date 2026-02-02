import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MarkerClusterer, MapMarker, ZoomControl, CustomOverlayMap } from 'react-kakao-maps-sdk';

const CommercialMap = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); // 클릭한 마커 정보 저장

  // @ts-ignore
  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${serverUrl}/api/commercial/stats`);
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError('데이터 로드 실패');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatMoney = (amount) => {
    if (amount >= 100000000) { // 1억 이상
      // 1. 억 단위로 나누고 소수점 1자리까지 자름 (예: 12345.67 -> "12345.7")
      // 2. 다시 숫자로 변환(Number) 후 toLocaleString()으로 콤마 추가 (12,345.7)
      const value = Number((amount / 100000000).toFixed(1));
      return `${value.toLocaleString()}억원`;
    }
    // 1억 미만은 만원 단위로
    return `${Math.round(amount / 10000).toLocaleString()}만원`;
  };

  return (
    <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', borderBottom: '1px solid #eee', zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>←</button>
        <h1 className="title" style={{ margin: 0, fontSize: '18px' }}>📊 서울 상권 매출 분석 (클러스터)</h1>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>데이터 분석 중... 📡</div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <Map
            center={{ lat: 37.5665, lng: 126.9780 }}
            style={{ width: '100%', height: '100%' }}
            level={8}
          >
            <ZoomControl position={"RIGHT"} />

            <MarkerClusterer
              averageCenter={true}
              minLevel={6} // 6레벨 이상 확대하면 마커로 흩어짐
              gridSize={60} // 클러스터링 범위 설정 (성능 최적화)
            >
              {data.map((item) => (
                <MapMarker
                  key={item.id}
                  position={{ lat: item.lat, lng: item.lng }}
                  onClick={() => setSelectedPlace(item)}
                />
              ))}
            </MarkerClusterer>

            {/* 마커 클릭 시 나타나는 상세 정보 커스텀 오버레이 */}
            {selectedPlace && (
              <CustomOverlayMap position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} yAnchor={1.2}>
                <div style={{
                  padding: '15px', background: 'white', borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid #ddd', minWidth: '160px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{selectedPlace.market_name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{selectedPlace.category_name}</div>
                  <div style={{ borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '8px', color: '#FF5722', fontWeight: 'bold' }}>
                    매출: {formatMoney(selectedPlace.monthly_sales)}
                  </div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    style={{ marginTop: '10px', width: '100%', fontSize: '11px', cursor: 'pointer' }}
                  >
                    닫기
                  </button>
                </div>
              </CustomOverlayMap>
            )}
          </Map>
        </div>
      )}
    </div>
  );
};

export default CommercialMap;