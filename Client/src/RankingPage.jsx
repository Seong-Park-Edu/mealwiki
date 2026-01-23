import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function RankingPage() {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
    
    const [activeTab, setActiveTab] = useState('restaurant'); // 'restaurant' | 'user'
    const [restaurantRank, setRestaurantRank] = useState([]);
    const [userRank, setUserRank] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resRank, uRank] = await Promise.all([
                    axios.get(`${apiUrl}/api/wiki/rank`),
                    axios.get(`${apiUrl}/api/user/rank`)
                ]);
                setRestaurantRank(resRank.data);
                setUserRank(uRank.data);
            } catch (error) { console.error("랭킹 로딩 실패", error); } finally { setLoading(false); }
        };
        fetchData();
    }, [apiUrl]);

    const getRankIcon = (index) => {
        if (index === 0) return "🥇";
        if (index === 1) return "🥈";
        if (index === 2) return "🥉";
        return <span style={{fontSize:'16px', color:'#888'}}>{index + 1}</span>;
    };

    return (
        <div className="page-container">
            {/* <button onClick={() => navigate(-1)} className="btn" style={{ marginBottom: '10px', padding:'0', color:'var(--text-sub)' }}>← 뒤로 가기</button> */}
            <h1 className="title text-center">🏆 명예의 전당</h1>

            <div className="tab-container">
                <button onClick={() => setActiveTab('restaurant')} className={`tab-btn ${activeTab === 'restaurant' ? 'active' : ''}`}>
                    🔥 맛집 랭킹
                </button>
                <button onClick={() => setActiveTab('user')} className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}>
                    😎 미식가 랭킹
                </button>
            </div>

            {loading ? (
                <div className="text-center sub-text" style={{padding:'40px'}}>집계 중... ⏳</div>
            ) : (
                <div className="restaurant-card" style={{ padding: '0' }}>
                    {activeTab === 'restaurant' ? (
                        restaurantRank.map((item, idx) => (
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
                        ))
                    ) : (
                        userRank.map((user, idx) => (
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
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default RankingPage;