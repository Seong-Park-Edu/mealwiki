import React, { useEffect } from 'react';

const AdSenseUnit = ({ isApp, slotId, format = 'auto', layoutKey }) => {
  // ★ [핵심] 앱(WebView) 환경이면 광고를 아예 그리지 않음 (공백 처리)
  // 앱에서는 React Native 레이어에서 별도로 배너를 띄울 것입니다.
  if (isApp) return null;

  useEffect(() => {
    try {
      // 개발 환경(localhost)이 아닐 때만 실제 요청
      if (window.location.hostname !== 'localhost') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense load error:", e);
    }
  }, []);

  return (
    <div className="adsense-wrapper" style={{ margin: '20px 0', textAlign: 'center', overflow: 'hidden' }}>
      {/* 로컬 개발 환경용 가짜 배너 */}
      {window.location.hostname === 'localhost' && (
        <div style={{ background: '#f0f0f0', padding: '20px', border: '1px dashed #ccc', color: '#888' }}>
          🖥️ 웹 광고 영역 (배포 시 애드센스 노출)
        </div>
      )}

      {/* 실제 애드센스 코드 */}
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-3217076747522132" // ★ 본인 ID 확인
           data-ad-slot={slotId}
           data-ad-format={format}
           data-full-width-responsive="true"
           {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})} 
      />
    </div>
  );
};

export default AdSenseUnit;