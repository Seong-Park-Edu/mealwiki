import React, { useEffect } from 'react';

const AdSenseUnit = ({ isApp, slotId }) => {
  // [소프트웨어적 관점] 앱 환경이라면 광고 렌더링을 완전히 차단합니다.
  if (isApp) return null;

  useEffect(() => {
    try {
      // 구글 애드센스 푸시 스크립트 실행
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense load error:", e);
    }
  }, []);

  return (
    <div 
      className="adsense-container" 
      style={{ 
        margin: '20px 0', 
        textAlign: 'center', 
        overflow: 'hidden',
        minHeight: '100px' 
      }}
    >
      {/* 실제 구글 애드센스 단위 코드 */}
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-3217076747522132" // 사용자님의 클라이언트 ID
           data-ad-slot={slotId}                   // 위치별 슬롯 ID
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdSenseUnit;