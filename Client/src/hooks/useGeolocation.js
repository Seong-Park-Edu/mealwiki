import { useState, useEffect } from 'react';

// 위치 정보 훅

export const useGeolocation = () => {
  const [location, setLocation] = useState({
    lat: 37.5665, lng: 126.9780, // 기본값: 서울시청
    loaded: false
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loaded: true }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loaded: true
        });
      },
      (err) => {
        console.error("GPS Error:", err);
        setLocation(prev => ({ ...prev, loaded: true }));
      },
      {
        enableHighAccuracy: true, // ★ 하드웨어 GPS를 사용하여 정확도 높임
        timeout: 10000,           // 10초 안에 응답 없으면 에러 처리
        maximumAge: 0             // 캐시된 위치 대신 실시간 위치 요청
      }
    );
  }, []);

  return location;
};