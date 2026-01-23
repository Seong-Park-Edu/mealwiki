import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const formatDate = (dateString) => {
    if (!dateString) return "날짜 없음";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "날짜 오류";
        return date.toLocaleDateString();
    } catch (e) { return "-"; }
};

const menuItemStyle = {
    padding: '12px 15px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#333', textAlign: 'left', display: 'block'
};

// ★ [수정] onLogout prop을 받습니다.
function AuthorPage({ onLogout }) {
    const { userId } = useParams();
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [acks, setAcks] = useState([]);
    const [bookmarks, setBookmarks] = useState([]); 
    const [loading, setLoading] = useState(true);

    // ★ [추가] 메뉴 상태 관리 및 본인 확인
    const [showMenu, setShowMenu] = useState(false);
    const myId = localStorage.getItem('userId');
    const isMine = myId === userId; // 내 페이지인지 확인

    const handleLogoutClick = () => {
        if (window.confirm("정말 로그아웃 하시겠습니까?")) {
            if (onLogout) onLogout(); // App.jsx에서 받은 함수 실행
            navigate('/');
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/user/${userId}`);
                const data = response.data;
                setProfile(data.profile || data.Profile);
                setReviews(data.reviews || data.Reviews || []);
                setAcks(data.acks || data.Acks || []);
                setBookmarks(data.bookmarks || data.Bookmarks || []);
            } catch (error) {
                console.error(error);
                alert("프로필 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId, apiUrl]);

    if (loading) return <div style={{ padding: '20px' }}>로딩 중... ⏳</div>;
    if (!profile) return <div style={{ padding: '20px' }}>사용자를 찾을 수 없습니다. 🤷‍♂️</div>;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} style={{ marginBottom: '15px', padding: '8px 12px', cursor: 'pointer' }}>← 뒤로</button>
            
            {/* 1. 프로필 카드 (relative 설정) */}
            <div style={{ 
                backgroundColor: 'white', padding: '30px', borderRadius: '15px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: '30px',
                border: '1px solid #eee', position: 'relative' // ★ 메뉴 위치 기준점
            }}>
                
                {/* ★ [추가] 톱니바퀴 (내 페이지일 때만 보임) */}
                {isMine && (
                    <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                        <span 
                            onClick={() => setShowMenu(!showMenu)} 
                            style={{ cursor: 'pointer', fontSize: '24px', userSelect: 'none' }}
                            title="설정"
                        >
                            ⚙️
                        </span>

                        {/* 드롭다운 메뉴 */}
                        {showMenu && (
                            <>
                                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99 }} onClick={() => setShowMenu(false)} />
                                <div style={{
                                    position: 'absolute', top: '35px', right: '0',
                                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '160px', overflow: 'hidden'
                                }}>
                                    <div 
                                        onClick={() => navigate('/change-password')}
                                        style={{...menuItemStyle, borderBottom: '1px solid #f0f0f0'}}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#f9f9f9'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        🔒 비밀번호 변경
                                    </div>
                                    <div 
                                        onClick={handleLogoutClick}
                                        style={{ ...menuItemStyle, color: '#F44336' }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#f9f9f9'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        🚪 로그아웃
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div style={{ fontSize: '60px', marginBottom: '10px' }}>😎</div>
                <h1 style={{ margin: '0', color: '#333' }}>
                    {profile.nickname || profile.Nickname || "익명"}
                </h1>
                <p style={{ color: '#888', fontSize: '14px' }}>
                    가입일: {formatDate(profile.createdAt || profile.CreatedAt)}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>{reviews.length}</div>
                        <div style={{ fontSize: '13px', color: '#666' }}>작성 리뷰</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#673AB7' }}>
                            {profile.totalLikes || profile.TotalLikes || 0}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>받은 추천</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E91E63' }}>{bookmarks.length}</div>
                        <div style={{ fontSize: '13px', color: '#666' }}>찜한 맛집</div>
                    </div>
                </div>
            </div>

            {/* 2. 찜한 맛집 리스트 */}
            <h3 style={{ borderBottom: '2px solid #E91E63', paddingBottom: '10px', color: '#E91E63' }}>
                ❤️ 내가 찜한 맛집 ({bookmarks.length})
            </h3>
            {bookmarks.length === 0 ? (
                <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>아직 찜한 식당이 없어요.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '40px' }}>
                    {bookmarks.map((b, idx) => {
                        const rId = b.restaurantId || b.RestaurantId;
                        const rName = b.restaurantName || b.RestaurantName || "이름 없음";
                        const rDate = b.createdAt || b.CreatedAt;
                        return (
                            <div key={idx} onClick={() => navigate(`/wiki/${rId}`)}
                                 style={{ padding: '15px', backgroundColor: '#FFF0F5', borderRadius: '12px', cursor: 'pointer', border: '1px solid #FFC1E3', transition: 'transform 0.2s' }}
                                 onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                 onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px', color: '#333' }}>{rName}</div>
                                <div style={{ fontSize: '12px', color: '#D81B60' }}>📅 {formatDate(rDate)} 찜</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 3. 작성한 리뷰 */}
            <h3 style={{ borderBottom: '2px solid #2196F3', paddingBottom: '10px', color: '#2196F3' }}>
                ✍️ 작성한 리뷰 ({reviews.length})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '40px' }}>
                {reviews.map((post, idx) => {
                    const pId = post.restaurantId || post.RestaurantId;
                    const pName = post.restaurantName || post.RestaurantName || "알 수 없음";
                    const pDate = post.updatedAt || post.UpdatedAt;
                    const pContent = post.content || post.Content || "";
                    const pLikes = post.likeCount ?? post.LikeCount ?? 0;
                    return (
                        <li key={idx} onClick={() => navigate(`/wiki/${pId}`)}
                            style={{ padding: '15px', border: '1px solid #eee', marginBottom: '10px', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <strong style={{ fontSize: '16px', color: '#333' }}>{pName}</strong>
                                <span style={{ fontSize: '12px', color: '#999' }}>{formatDate(pDate)}</span>
                            </div>
                            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{pContent}</p>
                            <div style={{ fontSize: '12px', color: '#673AB7', marginTop: '5px' }}>💜 추천 {pLikes}개 받음</div>
                        </li>
                    );
                })}
            </ul>

            {/* 4. 인정한 맛집 */}
            <h3 style={{ borderBottom: '2px solid #FF9800', paddingBottom: '10px', color: '#FF9800' }}>
                🔥 인정한 맛집 ({acks.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {acks.map((ack, idx) => (
                    <span key={idx} onClick={() => navigate(`/wiki/${ack.restaurantId || ack.RestaurantId}`)}
                          style={{ padding: '8px 15px', backgroundColor: '#FFF3E0', color: '#E65100', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #FFCC80' }}
                    >
                        {ack.restaurantName || ack.RestaurantName || "이름 없음"}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default AuthorPage;