import { useState, useEffect } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState({ 
    lat: 37.52964486850449, lng: 126.96999659692327, // 기본값: 아모레 퍼시픽
    loaded: false 
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("이 브라우저는 위치 정보를 지원하지 않습니다.");
      setLocation(prev => ({ ...prev, loaded: true }));
      return;
    }

    // ★ GPS 강화 옵션 설정
    const options = {
      enableHighAccuracy: true, // [하드웨어] GPS 칩을 사용하여 정확도 극대화
      timeout: 15000,           // [소프트웨어] 15초 안에 못 찾으면 에러 발생 (무한 대기 방지)
      maximumAge: 0             // [소프트웨어] 캐시된 과거 위치 대신 '지금' 위치 요청
    };

    const success = (pos) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        loaded: true
      });
      console.log(`GPS Success: (${pos.coords.latitude}, ${pos.coords.longitude})`);
    };

    const error = (err) => {
      console.error(`GPS Error (${err.code}): ${err.message}`);
      // 에러가 나도 로딩 상태는 완료로 표시 (시청 위치라도 띄우기 위함)
      setLocation(prev => ({ ...prev, loaded: true }));
    };

    // 위치 추적 시작
    navigator.geolocation.getCurrentPosition(success, error, options);

  }, []);

  return location;
};