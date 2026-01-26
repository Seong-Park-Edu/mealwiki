import { useState, useEffect } from 'react';

export const useIsApp = () => {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    // 브라우저의 이름표(User-Agent) 정보를 가져옵니다.
    const ua = window.navigator.userAgent;

    // 앱 프로젝트에서 설정했던 'MealWikiApp'이 포함되어 있는지 확인합니다.
    if (ua.indexOf('MealWikiApp') !== -1) {
      setIsApp(true);
    }
  }, []);

  return isApp;
};