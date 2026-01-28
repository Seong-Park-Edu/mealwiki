import { useEffect } from 'react';

const LogoutPage = () => {
  useEffect(() => {
    // 1. 저장된 정보 삭제
    localStorage.clear();

    // 2. 알림
    // alert("🧹 로그아웃(초기화) 되었습니다.");

    // 3. 홈으로 이동하며 새로고침 (확실한 초기화)
    window.location.href = '/';
  }, []);

  return <div style={{ textAlign: 'center', marginTop: '100px' }}>로그아웃 처리 중... ⏳</div>;
};

export default LogoutPage;