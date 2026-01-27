import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from './components/AdSenseUnit';

function RankingPage() {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    const [activeTab, setActiveTab] = useState('restaurant'); // 'restaurant' | 'user'
    const [restaurantRank, setRestaurantRank] = useState([]);
    const [userRank, setUserRank] = useState([]);
    const [searchRank, setSearchRank] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSearchItem, setSelectedSearchItem] = useState(null);

    // 앱 접속 여부 판단
    const [isApp, setIsApp] = useState(false);
    useEffect(() => {
        // 이름표(User-Agent)를 확인하여 앱 여부 판별
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
            setIsApp(true);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resRank, uRank, sRank] = await Promise.all([
                    axios.get(`${apiUrl}/api/wiki/rank`),
                    axios.get(`${apiUrl}/api/user/rank`),
                    axios.get(`${apiUrl}/api/Recommend/rank`)
                ]);
                setRestaurantRank(resRank.data);
                setUserRank(uRank.data);
                setSearchRank(sRank.data);
            } catch (error) { console.error("랭킹 로딩 실패", error); } finally { setLoading(false); }
        };
        fetchData();
    }, [apiUrl]);

    const getRankIcon = (index) => {
        if (index === 0) return "🥇";
        if (index === 1) return "🥈";
        if (index === 2) return "🥉";
        return <span style={{ fontSize: '16px', color: '#888' }}>{index + 1}</span>;
    };

    return (
        <div className="page-container">
            {/* <button onClick={() => navigate(-1)} className="btn" style={{ marginBottom: '10px', padding:'0', color:'var(--text-sub)' }}>← 뒤로 가기</button> */}
            <h1 className="title text-center">🏆 명예의 전당</h1>

            <div className="tab-container">
                <button onClick={() => setActiveTab('search')} className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}>
                    🔎 검색
                </button>
                <button onClick={() => setActiveTab('restaurant')} className={`tab-btn ${activeTab === 'restaurant' ? 'active' : ''}`}>
                    🔥 맛집
                </button>
                <button onClick={() => setActiveTab('user')} className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}>
                    😎 미식가
                </button>
            </div>

            {loading ? (
                <div className="text-center sub-text" style={{ padding: '40px' }}>집계 중... ⏳</div>
            ) : (
                <div className="restaurant-card" style={{ padding: '0' }}>
                    {/* 1. 검색 랭킹 탭 내용 */}
                    {activeTab === 'search' && searchRank.map((item, idx) => (
                        <div key={item.id} className="profile-card" onClick={() => setSelectedSearchItem(item)}> {/* ★ 바로 이동 대신 State 저장 */}
                            <div className="rank-badge">{getRankIcon(idx)}</div>
                            <div className="profile-info">
                                <div className="profile-name">{item.name}</div>
                                <div className="profile-meta">오늘 {item.count}회 추천됨</div>
                            </div>
                            <div style={{ color: '#FF5722', fontWeight: 'bold', fontSize: '12px' }}>HOT 🎯</div>
                        </div>
                    ))}

                    {/* 2. 맛집 랭킹 탭 내용 */}
                    {activeTab === 'restaurant' && restaurantRank.map((item, idx) => (
                        <div key={item.id} className="profile-card" onClick={() => navigate(`/wiki/${item.id}`)}>
                            <div className="rank-badge">{getRankIcon(idx)}</div>
                            <div className="profile-info">
                                <div className="profile-name">{item.name}</div>
                                <div className="profile-meta">{item.address}</div>
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#E65100', background: '#FFF3E0', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                                {item.ackCount}회 인정
                            </div>
                        </div>
                    ))}

                    {/* 3. 미식가 랭킹 탭 내용 */}
                    {activeTab === 'user' && userRank.map((user, idx) => (
                        <div key={user.id} className="profile-card" onClick={() => navigate(`/author/${user.id}`)}>
                            <div className="rank-badge">{getRankIcon(idx)}</div>
                            <div className="profile-info">
                                <div className="profile-name">{user.nickname}</div>
                                <div className="profile-meta">리뷰 {user.reviewCount}개 작성</div>
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#673AB7', background: '#EDE7F6', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                                💜 {user.totalLikes}
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* ★ 선택 모달 (NearbyPage 스타일과 동일) */}
            {selectedSearchItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }} onClick={() => setSelectedSearchItem(null)}>

                    <div style={{
                        width: '100%', maxWidth: '320px', backgroundColor: 'white',
                        borderRadius: '20px', padding: '24px', textAlign: 'center',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }} onClick={(e) => e.stopPropagation()}>

                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>{selectedSearchItem.name}</h3>
                        <p style={{ fontSize: '13px', color: '#777', marginBottom: '20px' }}>정보 확인 방법을 선택해주세요.</p>

                        <button
                            onClick={() => window.open(`https://place.map.kakao.com/${selectedSearchItem.id}`, '_blank')}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px',
                                border: 'none', background: '#FEE500', color: '#3C1E1E',
                                fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', cursor: 'pointer'
                            }}
                        >
                            💛 카카오 지도 (실시간 리뷰)
                        </button>

                        <button
                            onClick={() => navigate(`/wiki/${selectedSearchItem.id}`, {
                                state: { ...selectedSearchItem }
                            })}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px',
                                border: '1px solid #ddd', background: '#fff', color: '#555',
                                fontWeight: '500', fontSize: '14px', marginBottom: '15px', cursor: 'pointer'
                            }}
                        >
                            📝 MealWiki 상세 정보
                        </button>

                        <button
                            onClick={() => setSelectedSearchItem(null)}
                            style={{ background: 'none', border: 'none', color: '#999', fontSize: '13px', textDecoration: 'underline' }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}



            {/* [배치 2] 중간 광고: 지도와 룰렛 버튼 사이 */}
            <AdSenseUnit isApp={isApp} slotId="1188063662" />

        </div>
    );
}

export default RankingPage;