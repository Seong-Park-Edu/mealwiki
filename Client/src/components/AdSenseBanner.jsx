import React from 'react';
import { useIsApp } from '../hooks/useIsApp';

const AdSenseBanner = () => {
  const isApp = useIsApp();

  // [소프트웨어적 관점] 앱 환경(isApp이 true)이라면 광고를 렌더링하지 않고 종료합니다.
  if (isApp) {
    console.log("App 환경 감지: 애드센스 노출을 차단합니다.");
    return null;
  }

  // 일반 웹 환경일 때만 아래 광고 코드가 작동합니다.
  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      {/* 실제 구글 애드센스 코드를 여기에 넣으세요 */}
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // 본인의 ID
           data-ad-slot="XXXXXXXXXX"               // 광고 단위 ID
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdSenseBanner;