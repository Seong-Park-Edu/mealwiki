import React, { useEffect, useRef } from 'react';

const KakaoMap = ({ center, markers = [], onMarkerClick, onMapIdle, style }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // 1. 지도 초기화
  useEffect(() => {
    // kakao 객체가 없으면 리턴
    if (!window.kakao || !mapContainer.current) return;

    // ★ [핵심] 로드 완료 후 실행되도록 감싸기
    window.kakao.maps.load(() => {
      
      if (!mapInstance.current) {
        // 지도 최초 생성
        const options = { 
          center: new window.kakao.maps.LatLng(center.lat, center.lng), 
          level: 3 
        };
        mapInstance.current = new window.kakao.maps.Map(mapContainer.current, options);

        // 지도 이동 멈춤(idle) 이벤트
        window.kakao.maps.event.addListener(mapInstance.current, 'idle', () => {
          if (onMapIdle) {
            const newCenter = mapInstance.current.getCenter();
            onMapIdle(newCenter.getLat(), newCenter.getLng());
          }
        });
      } else {
        // 이미 지도가 있다면 중심만 이동
        const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng);
        mapInstance.current.panTo(moveLatLon);
      }
      
    });
  }, [center.lat, center.lng]); 

  // 2. 마커 렌더링
  useEffect(() => {
    if (!mapInstance.current || !window.kakao) return;

    window.kakao.maps.load(() => {
      const map = mapInstance.current;

      // 기존 마커 지우기
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // 새 마커 찍기
      markers.forEach(place => {
        const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map: map,
          title: place.place_name
        });

        if (onMarkerClick) {
          window.kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(place));
        }
        markersRef.current.push(marker);
      });
    });
  }, [markers, onMarkerClick]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%', ...style }}></div>;
};

export default KakaoMap;