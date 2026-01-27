import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from '../components/AdSenseUnit';

function GroupJoinPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5068';

  // 방 생성
  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const userId = localStorage.getItem('nickname') || '익명';
      const response = await axios.post(`${API_URL}/api/GroupRoulette/create`, {
        hostId: userId,
        title: `${userId}님의 점심 팟`
      });

      if (response.data.success) {
        navigate(`/group/${response.data.roomCode}`);
      }
    } catch (error) {
      alert("방 생성 실패! 서버가 켜져 있나요?");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  // 방 입장
  const handleJoinRoom = () => {
    if (roomCode.length < 4) return alert("코드를 확인해주세요!");
    navigate(`/group/${roomCode.toUpperCase()}`);
  };

  // 앱 접속 여부 판단
  const [isApp, setIsApp] = useState(false);
  useEffect(() => {
    // 이름표(User-Agent)를 확인하여 앱 여부 판별
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
      setIsApp(true);
    }
  }, []);

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="title">🤝 함께 메뉴 정하기</h1>
      <p className="sub-text" style={{ marginBottom: '40px' }}>초대 코드로 입장하거나 방을 만들어보세요.</p>

      {/* 코드 입력 카드 */}
      <div className="wiki-editor-card" style={{ padding: '30px 20px', marginBottom: '30px' }}>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="코드 입력 (예: A7B9)"
          className="wiki-textarea"
          style={{
            textAlign: 'center', fontSize: '24px', letterSpacing: '4px',
            fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px'
          }}
        />
        <button className="btn-primary" onClick={handleJoinRoom} style={{ width: '100%' }}>
          입장하기 🚀
        </button>
      </div>

      <div style={{ borderTop: '1px solid #eee', margin: '20px 0' }}></div>

      <button
        onClick={handleCreateRoom}
        disabled={isCreating}
        style={{
          background: 'white', border: '1px solid var(--primary)', color: 'var(--primary)',
          padding: '15px', borderRadius: '12px', width: '100%', fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        {isCreating ? '생성 중...' : '➕ 새 방 만들기'}
      </button>

      <AdSenseUnit isApp={isApp} slotId="2240644084"/>

    </div>
  );
}

export default GroupJoinPage;