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
      }
    );
  }, []);

  return location;
};