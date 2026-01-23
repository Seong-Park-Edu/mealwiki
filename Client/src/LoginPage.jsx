import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ setIsLoggedIn }) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // ★ 이메일 추가
  
  // 화면 모드: 'login'(로그인), 'signup'(회원가입), 'find'(비밀번호 찾기)
  const [mode, setMode] = useState('login'); 
  
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. 비밀번호 찾기 모드일 때
    if (mode === 'find') {
        if (!nickname || !email) return alert("닉네임과 이메일을 모두 입력해주세요.");
        try {
            const response = await axios.post(`${apiUrl}/api/user/find-password`, { nickname, email });
            alert(`[임시 비밀번호 발급]\n\n🔑: ${response.data.tempPassword}\n\n로그인 후 변경해주세요.`);
            setMode('login'); // 로그인 화면으로 이동
            setPassword(response.data.tempPassword); // 편의상 입력해줌
        } catch (error) {
            alert(error.response?.data || "정보를 찾을 수 없습니다.");
        }
        return;
    }

    // 2. 로그인 또는 회원가입 모드일 때
    const endpoint = mode === 'signup' ? '/api/user/signup' : '/api/user/login';
    
    // 유효성 검사
    if (!nickname || !password) return alert("닉네임과 비밀번호를 입력해주세요.");
    if (mode === 'signup' && !email) return alert("비밀번호 찾기에 사용할 이메일을 입력해주세요.");

    try {
      const response = await axios.post(`${apiUrl}${endpoint}`, {
        nickname,
        password,
        email // 회원가입/로그인 시 이메일 정보 전송
      });

      // 로그인 성공 처리
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('nickname', response.data.nickname);
      
      alert(response.data.message);
      setIsLoggedIn(true);
      navigate(-1); // 이전 페이지로 복귀
    } catch (error) {
      alert(error.response?.data || "오류가 발생했습니다.");
    }
  };

  // 모드에 따른 제목과 버튼 텍스트 설정
  const getTitle = () => {
      if (mode === 'signup') return "회원가입";
      if (mode === 'find') return "비밀번호 찾기";
      return "로그인";
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>{getTitle()}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* 1. 닉네임 (항상 보임) */}
        <input 
          placeholder="닉네임" 
          value={nickname} 
          onChange={(e) => setNickname(e.target.value)} 
          style={inputStyle}
        />

        {/* 2. 비밀번호 (비번 찾기 모드에선 숨김) */}
        {mode !== 'find' && (
            <input 
              type="password" 
              placeholder="비밀번호" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={inputStyle}
            />
        )}

        {/* 3. 이메일 (로그인 모드에선 선택, 나머진 필수) */}
        {(mode === 'signup' || mode === 'find') && (
             <input 
               type="email" 
               placeholder={mode === 'signup' ? "이메일 (비밀번호 분실 대비용)" : "가입할 때 쓴 이메일"}
               value={email} 
               onChange={(e) => setEmail(e.target.value)} 
               style={inputStyle}
             />
        )}
        
        {/* 액션 버튼 */}
        <button type="submit" style={buttonStyle}>
          {mode === 'signup' ? "✨ 가입하기" : mode === 'find' ? "🔍 임시 비번 받기" : "🚀 로그인하기"}
        </button>
      </form>

      {/* 하단 링크들 */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
        
        {mode === 'login' && (
            <>
                <span onClick={() => setMode('signup')} style={linkStyle}>
                    아직 계정이 없나요? <b>회원가입</b>
                </span>
                <span onClick={() => setMode('find')} style={{...linkStyle, color: '#999'}}>
                    비밀번호를 잊으셨나요?
                </span>
            </>
        )}

        {mode === 'signup' && (
            <span onClick={() => setMode('login')} style={linkStyle}>
                이미 계정이 있나요? <b>로그인</b>
            </span>
        )}

        {mode === 'find' && (
            <span onClick={() => setMode('login')} style={linkStyle}>
                ← 로그인 화면으로 돌아가기
            </span>
        )}

      </div>
    </div>
  );
};

// 스타일 객체 (깔끔하게 정리)
const inputStyle = { padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' };
const buttonStyle = { padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' };
const linkStyle = { cursor: 'pointer', color: '#007bff' };

export default LoginPage;