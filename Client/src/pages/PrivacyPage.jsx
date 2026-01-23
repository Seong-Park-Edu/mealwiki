import React from 'react';

function PrivacyPage() {
  return (
    <div className="page-container" style={{ lineHeight: '1.6', color: '#333' }}>
      <h1 className="title">개인정보처리방침</h1>
      <p>MealWiki는 사용자의 개인정보를 소중하게 생각하며, 관련 법령을 준수합니다.</p>
      
      <h3>1. 수집하는 항목</h3>
      <p>본 서비스는 별도의 회원가입 없이 이용 가능하며, 서비스 이용 과정에서 쿠키(Cookie)나 접속 로그가 자동으로 생성되어 수집될 수 있습니다.</p>
      
      <h3>2. 이용 목적</h3>
      <p>수집된 정보는 서비스 개선 및 구글 애드센스 광고 송출을 위한 통계 분석용으로만 사용됩니다.</p>
      
      <h3>3. 구글 애드센스 사용</h3>
      <p>본 사이트는 구글 애드센스를 통해 광고를 게시합니다. 구글은 사용자의 방문 기록을 바탕으로 맞춤형 광고를 제공하기 위해 쿠키를 사용합니다.</p>
      
      <button onClick={() => window.history.back()} className="btn-primary" style={{ marginTop: '20px' }}>
        뒤로 가기
      </button>
    </div>
  );
}

export default PrivacyPage;