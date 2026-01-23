import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ChangePasswordPage() {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    const myNickname = localStorage.getItem('nickname');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // 비밀번호 일치 여부 메시지 상태
    const [matchMessage, setMatchMessage] = useState('');
    const [isMatch, setIsMatch] = useState(false);

    // ★ 실시간 검증 로직 (useEffect)
    useEffect(() => {
        if (!newPassword || !confirmPassword) {
            setMatchMessage('');
            setIsMatch(false);
            return;
        }

        if (newPassword === confirmPassword) {
            setMatchMessage('비밀번호가 일치합니다. ✅');
            setIsMatch(true);
        } else {
            setMatchMessage('비밀번호가 서로 다릅니다. ❌');
            setIsMatch(false);
        }
    }, [newPassword, confirmPassword]);

    const handleSubmit = async () => {
        // 1. 빈칸 체크
        if (!oldPassword || !newPassword || !confirmPassword) {
            return alert("모든 칸을 입력해주세요.");
        }

        // 2. 일치 여부 체크 (한 번 더 안전장치)
        if (!isMatch) {
            return alert("새 비밀번호가 서로 일치하지 않습니다. 다시 확인해주세요.");
        }

        // 3. 현재 비번과 새 비번이 같은지 체크 (선택사항)
        if (oldPassword === newPassword) {
            return alert("현재 비밀번호와 다른 새로운 비밀번호를 입력해주세요.");
        }

        try {
            await axios.post(`${apiUrl}/api/user/change-password`, {
                nickname: myNickname,
                oldPassword: oldPassword,
                newPassword: newPassword
            });

            alert("성공적으로 변경되었습니다! \n새 비밀번호로 다시 로그인해주세요.");
            
            // 로그아웃 처리
            localStorage.removeItem('userId');
            localStorage.removeItem('nickname');
            window.location.href = '/login'; 
        } catch (error) {
            alert(error.response?.data || "비밀번호 변경 실패 (현재 비밀번호를 확인하세요)");
        }
    };

    return (
        <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: '#333' }}>🔒 비밀번호 변경</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>
                안전한 입력을 위해 새 비밀번호를 두 번 입력해주세요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                
                {/* 현재 비밀번호 */}
                <div>
                    <label style={labelStyle}>현재 비밀번호</label>
                    <input 
                        type="password" 
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="사용 중인 비밀번호"
                    />
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '5px 0' }} />

                {/* 새 비밀번호 */}
                <div>
                    <label style={labelStyle}>새 비밀번호</label>
                    <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="변경할 비밀번호"
                    />
                </div>

                {/* 새 비밀번호 확인 */}
                <div>
                    <label style={labelStyle}>새 비밀번호 확인</label>
                    <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="한 번 더 입력"
                    />
                    {/* ★ 실시간 검증 메시지 출력 */}
                    <p style={{ 
                        fontSize: '12px', 
                        marginTop: '5px', 
                        fontWeight: 'bold',
                        color: isMatch ? '#4CAF50' : '#F44336' // 일치하면 초록색, 아니면 빨간색
                    }}>
                        {matchMessage}
                    </p>
                </div>

                <button 
                    onClick={handleSubmit} 
                    disabled={!isMatch} // 일치하지 않으면 버튼 비활성화 (UX 강화)
                    style={{
                        ...buttonStyle,
                        backgroundColor: isMatch ? '#4CAF50' : '#ccc',
                        cursor: isMatch ? 'pointer' : 'not-allowed'
                    }}
                >
                    변경하기
                </button>
            </div>
        </div>
    );
}

const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '15px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px', transition: 'background-color 0.3s' };

export default ChangePasswordPage;