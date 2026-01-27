import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import AdSenseUnit from '../components/AdSenseUnit';

// Supabase 클라이언트 생성
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function GroupRoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  // 상태 관리
  const [roomId, setRoomId] = useState(null);
  const [menus, setMenus] = useState([]);
  const [inputMenu, setInputMenu] = useState('');
  const [myNickname] = useState(localStorage.getItem('nickname') || '익명');
  const [isApp, setIsApp] = useState(false);

  // ★ 추가된 상태: 룰렛 결과 및 애니메이션용
  const [winner, setWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const scrollRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5068';

  // 1. 방 정보 로드 및 실시간 구독 (메뉴 추가 + 방 상태 변경)
  useEffect(() => {
    // 앱 여부 확인
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
      setIsApp(true);
    }

    // ★ [핵심 1] 청소할 채널들을 담아둘 변수를 함수 밖(여기)에 만듭니다.
    let activeChannels = [];

    const setupRoom = async () => {
      // 1-1. 방 정보 가져오기
      const { data: roomData, error } = await supabase
        .from('rouletterooms')
        .select('id, title, status, winner_menu')
        .eq('room_code', roomCode)
        .single();

      if (error || !roomData) {
        alert("존재하지 않는 방입니다.");
        navigate('/group');
        return;
      }

      setRoomId(roomData.id);

      // 이미 끝난 방이면 결과 보여주기
      if (roomData.status === 'finished' && roomData.winner_menu) {
        setWinner(roomData.winner_menu);
      }

      // 1-2. 기존 메뉴 리스트 가져오기
      const { data: menuData } = await supabase
        .from('roomcandidates')
        .select('*')
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: false });

      setMenus(menuData || []);

      // 1-3. 실시간 구독

      // (A) 메뉴 채널
      const menuChannel = supabase
        .channel(`room-menus-${roomData.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'roomcandidates', filter: `room_id=eq.${roomData.id}` },
          (payload) => {
            setMenus((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe();

      // 만든 채널을 바구니에 담기
      activeChannels.push(menuChannel);

      // (B) 방 상태(룰렛/리셋) 채널
      const roomChannel = supabase
        .channel(`room-status-${roomData.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rouletterooms' },
          (payload) => {
            // ID 비교 (느슨한 비교 == 사용)
            if (payload.new.id == roomData.id) {

              // 1. 룰렛이 끝났을 때
              if (payload.new.status === 'finished') {
                triggerRouletteAnimation(payload.new.winner_menu);
              }

              // 2. 리셋 되었을 때
              if (payload.new.status === 'waiting') {
                setWinner(null);
                setIsSpinning(false);
                // alert("방장이 게임을 리셋했습니다! 다시 시작하세요.");
              }
            }
          }
        )
        .subscribe();

      // 만든 채널을 바구니에 담기
      activeChannels.push(roomChannel);
    };

    setupRoom();

    // ★ [핵심 2] React가 진짜로 실행하는 청소 함수는 여기에 있어야 합니다.
    return () => {
      // 바구니에 담긴 모든 채널을 확실하게 삭제
      activeChannels.forEach(channel => supabase.removeChannel(channel));
    };

  }, [roomCode, navigate]);

  // 2. 룰렛 애니메이션 로직
  const triggerRouletteAnimation = (winningMenu) => {
    setIsSpinning(true);
    // 3초간 두구두구 연출 후 결과 공개
    setTimeout(() => {
      setIsSpinning(false);
      setWinner(winningMenu);
    }, 3000);
  };

  // 3. 메뉴 추가 핸들러
  const handleAddMenu = async () => {
    if (!inputMenu.trim()) return;
    try {
      await axios.post(`${API_URL}/api/GroupRoulette/add-menu`, {
        roomCode: roomCode,
        menuName: inputMenu,
        userName: myNickname
      });
      setInputMenu('');
    } catch (e) {
      console.error(e);
      alert("추가 실패 ㅠㅠ");
    }
  };

  // 4. ★ [누락되었던 부분] 룰렛 돌리기 핸들러
  const handleSpin = async () => {
    if (menus.length === 0) return alert("메뉴를 먼저 추가해주세요!");
    // if (!confirm("모두의 운명을 결정하시겠습니까?")) return;

    try {
      await axios.post(`${API_URL}/api/GroupRoulette/spin`, { roomCode });
      // 성공하면 아무것도 안 해도 됨 (Realtime이 감지해서 애니메이션 실행함)
    } catch (e) {
      console.error(e);
      alert("룰렛 시작 실패! (백엔드 Spin 메서드를 확인하세요)");
    }
  };

  // 리셋(다시 하기) 요청 함수
  const handleRestart = async () => {
    // if (!confirm("결과를 취소하고 다시 하시겠습니까?")) return;
    try {
      await axios.post(`${API_URL}/api/GroupRoulette/restart`, { roomCode });
      // 성공하면 Realtime이 감지해서 창을 닫아줄 겁니다.
    } catch (e) {
      console.error(e);
      alert("리셋 실패!");
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '120px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#888' }}>CODE: </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>{roomCode}</span>
        </div>
        <button onClick={() => {
          navigator.clipboard.writeText(roomCode);
          alert("코드가 복사되었습니다!");
        }} style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '10px', border: '1px solid #ddd', background: 'white' }}>
          🔗 코드 복사
        </button>
      </div>

      <h1 className="title" style={{ fontSize: '22px', marginBottom: '20px' }}>
        🍽️ 오늘의 메뉴 후보 ({menus.length})
      </h1>

      {/* 메뉴 리스트 */}
      <div className="menu-list" ref={scrollRef}>
        {menus.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ccc' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🥘</div>
            아직 메뉴가 없어요.<br />첫 번째 메뉴를 등록해주세요!
          </div>
        ) : (
          menus.map((m) => (
            <div key={m.id} className="restaurant-card animate-pop" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{m.menu_name}</span>
              <span style={{ fontSize: '12px', color: '#999', background: '#f5f5f5', padding: '4px 8px', borderRadius: '8px' }}>
                {m.user_name}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 광고 영역 */}
      <div style={{ marginTop: '20px' }}>
        <AdSenseUnit isApp={isApp} slotId="1571207047" />
      </div>

      {/* 하단 입력창 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '15px', background: 'white', borderTop: '1px solid #eee',
        display: 'flex', gap: '10px', zIndex: 100,
        boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
      }}>
        <input
          className="wiki-textarea"
          style={{ marginBottom: 0, flex: 1, height: '50px' }}
          placeholder="먹고 싶은 메뉴 입력!"
          value={inputMenu}
          onChange={(e) => setInputMenu(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddMenu()}
        />
        <button
          className="btn-primary"
          onClick={handleAddMenu}
          style={{ width: '80px', height: '50px', fontSize: '16px', margin: 0 }}
        >
          추가
        </button>
      </div>

      {/* ★ 룰렛 돌리기 버튼 (플로팅 버튼) */}
      <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 90 }}>
        <button
          onClick={handleSpin}
          className="btn-primary"
          style={{
            borderRadius: '50%', width: '60px', height: '60px',
            fontSize: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0
          }}
        >
          🎲
        </button>
      </div>

      {/* ★ 룰렛 애니메이션 오버레이 */}
      {isSpinning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', color: 'white'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'spin 0.5s infinite linear' }}>🎰</div>
          <h2 style={{ fontSize: '24px' }}>운명의 룰렛이 돌아갑니다!</h2>
          <p style={{ color: '#ccc' }}>두구두구두구...</p>
        </div>
      )}

      {/* ★ 결과 발표 모달 */}
      {winner && !isSpinning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="wiki-editor-card animate-pop" style={{ textAlign: 'center', padding: '40px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, color: '#666' }}>👑 오늘의 점심 메뉴 👑</h3>
            <h1 style={{ color: 'var(--primary)', fontSize: '42px', margin: '30px 0', fontWeight: 'bold' }}>{winner}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 지도 보기 버튼 */}
              <button className="btn-primary" onClick={() => window.open(`https://map.naver.com/v5/search/${winner}`, '_blank')}>
                지도 보기 🗺️
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* ★ [추가] 다시 하기 버튼 */}
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#ffeba7', color: '#5a4a00', fontWeight: 'bold', border: 'none' }}
                  onClick={handleRestart}
                >
                  🔄 다시 하기
                </button>

                {/* 닫기 버튼 */}
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ddd', background: '#f5f5f5', fontWeight: 'bold' }}
                  onClick={() => setWinner(null)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupRoomPage;