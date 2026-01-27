import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdSenseUnit from './components/AdSenseUnit';

function RankingPage() {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';

    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'restaurant' | 'user'
    
    // 각 탭별 데이터를 담을 상태
    const [restaurantRank, setRestaurantRank] = useState([]);
    const [userRank, setUserRank] = useState([]);
    const [searchRank, setSearchRank] = useState([]);
    
    // 공통 상태
    const [loading, setLoading] = useState(true); // 전체 화면 로딩
    const [selectedSearchItem, setSelectedSearchItem] = useState(null);
    const [isApp, setIsApp] = useState(false);

    // 무한 스크롤 관련 상태
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [fetching, setFetching] = useState(false);

    // 1. 통합된 데이터 가져오기 함수
    const fetchMoreData = useCallback(async (isFirstLoad = false) => {
        // 이미 로딩 중이거나(첫 로딩 제외), 더 이상 데이터가 없으면 중단
        if (fetching || (!hasMore && !isFirstLoad)) return;

        setFetching(true);
        const targetPage = isFirstLoad ? 1 : page; 

        // 탭에 따라 API 주소와 저장할 State Setter를 결정 (Factory 패턴)
        let endpoint = '';
        let setData = null;

        if (activeTab === 'search') {
            endpoint = '/api/Recommend/rank';
            setData = setSearchRank;
        } else if (activeTab === 'restaurant') {
            endpoint = '/api/wiki/rank';
            setData = setRestaurantRank;
        } else if (activeTab === 'user') {
            endpoint = '/api/user/rank';
            setData = setUserRank;
        }

        try {
            const res = await axios.get(`${apiUrl}${endpoint}`, {
                params: { page: targetPage, pageSize: 10 }
            });

            // 데이터가 10개 미만이면 마지막 페이지로 간주
            if (res.data.length < 10) setHasMore(false);

            setData(prev => {
                // 첫 로딩이면 덮어쓰기, 아니면 이어붙이기
                const newData = isFirstLoad ? res.data : [...prev, ...res.data];

                // 중복 제거 (ID 기준) - 모든 탭의 데이터 모델에 'id'가 있어서 공통 사용 가능
                const uniqueData = newData.filter((item, index, self) =>
                    index === self.findIndex((t) => t.id === item.id)
                );
                return uniqueData;
            });

            // 페이지 증가
            setPage(targetPage + 1);

        } catch (e) {
            console.error(`${activeTab} 랭킹 로딩 실패`, e);
        } finally {
            setFetching(false);
            if (isFirstLoad) setLoading(false); 
        }
    }, [activeTab, fetching, hasMore, page, apiUrl]); // 의존성 배열 중요


    // 2. 탭이 변경될 때 상태 초기화 및 첫 로딩
    useEffect(() => {
        // 1. 상태 초기화
        setPage(1);
        setHasMore(true);
        setLoading(true); // 스피너 켜기
        
        // *중요* 기존 데이터를 비워줘야 탭 전환 시 이전 데이터가 잠깐 보이는 현상 방지
        if (activeTab === 'search') setSearchRank([]);
        if (activeTab === 'restaurant') setRestaurantRank([]);
        if (activeTab === 'user') setUserRank([]);

        // 2. 데이터 호출 (isFirstLoad = true)
        fetchMoreData(true);

    }, [activeTab]); // activeTab이 바뀔 때마다 실행


    // 3. 스크롤 감지 (기존 코드와 동일하지만 의존성에 fetchMoreData 추가)
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
            const clientHeight = window.innerHeight;
            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

            if (scrollTop + clientHeight >= scrollHeight - 50) {
                if (!fetching && hasMore) {
                    fetchMoreData(); // 인자 없이 호출하면 다음 페이지 로딩
                }
            }
        };

        document.addEventListener('scroll', handleScroll, true);
        return () => document.removeEventListener('scroll', handleScroll, true);
    }, [fetching, hasMore, fetchMoreData]); // fetchMoreData가 바뀔 때(activeTab 변경 등) 리스너 갱신


    // 4. 앱 여부 확인 (기존 코드 유지)
    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
            setIsApp(true);
        }
    }, []);

    // 5. 랭킹 아이콘 헬퍼 (기존 코드 유지)
    const getRankIcon = (index) => {
        if (index === 0) return "🥇";
        if (index === 1) return "🥈";
        if (index === 2) return "🥉";
        return <span style={{ fontSize: '16px', color: '#888' }}>{index + 1}</span>;
    };


    return (
        <div className="page-container">
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
                    
                    {/* 탭 내용 렌더링 부분은 기존 코드와 동일합니다. 데이터 소스만 확인하세요. */}
                    
                    {/* 1. 검색 랭킹 */}
                    {activeTab === 'search' && searchRank.map((item, idx) => (
                         <div key={item.id}>
                            <div className="profile-card" onClick={() => setSelectedSearchItem(item)}>
                                <div className="rank-badge">{getRankIcon(idx)}</div>
                                <div className="profile-info">
                                    <div className="profile-name">{item.name}</div>
                                    <div className="profile-meta">오늘 {item.count}회 추천됨</div>
                                </div>
                                <div style={{ color: '#FF5722', fontWeight: 'bold', fontSize: '12px' }}>HOT 🎯</div>
                            </div>
                            {(idx + 1) % 5 === 0 && <AdSenseUnit isApp={isApp} slotId="9379099208" format="fluid" layoutKey="-gw-3+1f-3d+2z" />}
                        </div>
                    ))}

                    {/* 2. 맛집 랭킹 */}
                    {activeTab === 'restaurant' && restaurantRank.map((item, idx) => (
                        <div key={item.id}>
                            <div className="profile-card" onClick={() => navigate(`/wiki/${item.id}`)}>
                                <div className="rank-badge">{getRankIcon(idx)}</div>
                                <div className="profile-info">
                                    <div className="profile-name">{item.name}</div>
                                    <div className="profile-meta">{item.address}</div>
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#E65100', background: '#FFF3E0', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                                    {item.ackCount}회 인정
                                </div>
                            </div>
                            {(idx + 1) % 5 === 0 && <AdSenseUnit isApp={isApp} slotId="6493081416" format="fluid" layoutKey="-gw-3+1f-3d+2z" />}
                        </div>
                    ))}

                    {/* 3. 미식가 랭킹 */}
                    {activeTab === 'user' && userRank.map((user, idx) => (
                        <div key={user.id}>
                            <div className="profile-card" onClick={() => navigate(`/author/${user.id}`)}>
                                <div className="rank-badge">{getRankIcon(idx)}</div>
                                <div className="profile-info">
                                    <div className="profile-name">{user.nickname}</div>
                                    <div className="profile-meta">리뷰 {user.reviewCount}개 작성</div>
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#673AB7', background: '#EDE7F6', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                                    💜 {user.totalLikes}
                                </div>
                            </div>
                            {(idx + 1) % 5 === 0 && <AdSenseUnit isApp={isApp} slotId="2019483938" format="fluid" layoutKey="-gw-3+1f-3d+2z" />}
                        </div>
                    ))}
                </div>
            )}

            {/* 선택 모달 및 하단 광고는 기존 코드 유지 */}
            {selectedSearchItem && (
                 <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                }} onClick={() => setSelectedSearchItem(null)}>
                    {/* 모달 내용 기존과 동일 */}
                     <div style={{
                        width: '100%', maxWidth: '320px', backgroundColor: 'white',
                        borderRadius: '20px', padding: '24px', textAlign: 'center',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* ... 기존 버튼들 ... */}
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>{selectedSearchItem.name}</h3>
                        <p style={{ fontSize: '13px', color: '#777', marginBottom: '20px' }}>정보 확인 방법을 선택해주세요.</p>
                         <button onClick={() => window.open(`https://place.map.kakao.com/${selectedSearchItem.id}`, '_blank')} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', cursor: 'pointer' }}>💛 카카오 지도 (실시간 리뷰)</button>
                        <button onClick={() => navigate(`/wiki/${selectedSearchItem.id}`, { state: { ...selectedSearchItem } })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ddd', background: '#fff', color: '#555', fontWeight: '500', fontSize: '14px', marginBottom: '15px', cursor: 'pointer' }}>📝 MealWiki 상세 정보</button>
                        <button onClick={() => setSelectedSearchItem(null)} style={{ background: 'none', border: 'none', color: '#999', fontSize: '13px', textDecoration: 'underline' }}>취소</button>
                    </div>
                </div>
            )}

            <AdSenseUnit isApp={isApp} slotId="1188063662" />
        </div>
    );
}

export default RankingPage;