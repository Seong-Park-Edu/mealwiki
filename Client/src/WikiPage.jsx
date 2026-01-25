import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const formatTime = (dateString) => new Date(dateString).toLocaleString();
const PREDEFINED_TAGS = ["🍚 혼밥가능", "👩‍❤️‍👨 데이트", "🍺 회식장소", "💸 가성비갑", "😋 JMT(존맛)", "✨ 분위기맛집", "😊 친절해요", "🚗 주차가능", "🏞️ 뷰맛집", "🤫 조용해요"];

const ReputationBadge = ({ count }) => (
    <span style={{ fontSize: '11px', color: '#673AB7', backgroundColor: '#EDE7F6', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px' }}>
        💜 {count}
    </span>
);

function WikiPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // 1. 초기값 설정 시 데이터 파싱 (안전하게 처리)
    const initialState = location.state || {};
    const [restaurantName, setRestaurantName] = useState(initialState.name || "");
    const [restaurantAddress, setRestaurantAddress] = useState(initialState.address || "");
    
    // ★ 좌표 초기화 로직 개선
    const [coord, setCoord] = useState(() => {
        const x = initialState.x ? parseFloat(initialState.x) : null;
        const y = initialState.y ? parseFloat(initialState.y) : null;
        // 유효한 좌표면 사용, 아니면 서울시청 기본값
        return (x && y) ? { x, y } : { x: 126.9780, y: 37.5665 };
    });

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
    const mapContainer = useRef(null);

    // ... (기존 state들 유지)
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [historyList, setHistoryList] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [ackCount, setAckCount] = useState(0);
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [myNickname, setMyNickname] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tagStats, setTagStats] = useState({});
    const [creator, setCreator] = useState({ name: '정보 없음', id: null, likes: 0 });
    const [editor, setEditor] = useState({ name: '정보 없음', id: null, likes: 0 });
    const [updatedAt, setUpdatedAt] = useState('');
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [visibleCount, setVisibleCount] = useState(6);
    const [images, setImages] = useState([]);
    const fileInputRef = useRef(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedContent, setSelectedContent] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const handleTemplateClick = (label) => {
        const template = `\n📌 ${label}: `;
        setContent(prev => prev + template);
        document.getElementById('wiki-editor').focus();
    };

    useEffect(() => {
        const storedNickname = localStorage.getItem('nickname');
        const storedUserId = localStorage.getItem('userId');
        const storedRole = localStorage.getItem('role');
        if (storedNickname && storedUserId) {
            setMyNickname(storedNickname);
            setIsLoggedIn(true);
            if (storedRole === 'admin' || storedRole === 'Admin') {
                setIsAdmin(true);
            }
        }
    }, []);

    const fetchWiki = async () => {
        try {
            const storedNickname = localStorage.getItem('nickname');
            const query = storedNickname
                ? `?nickname=${storedNickname}&t=${new Date().getTime()}`
                : `?t=${new Date().getTime()}`;
            const response = await axios.get(`${apiUrl}/api/wiki/${id}${query}`);

            if (response.data) {
                const data = response.data;
                setIsLocked(data.isLocked ?? data.IsLocked ?? false);
                setImages(data.Images || data.images || []);

                const rAck = data.RestaurantAck ?? data.restaurantAck ?? 0;
                setAckCount(rAck);
                const likes = data.likeCount ?? data.LikeCount ?? 0;
                setLikeCount(likes);
                setIsLiked(data.IsLiked || data.isLiked || false);

                if (data.content || data.Content) setContent(data.content || data.Content);
                const rName = data.RestaurantName || data.restaurantName;
                if (rName) setRestaurantName(rName);
                const rAddr = data.Address || data.address;
                if (rAddr) setRestaurantAddress(rAddr);
                
                // ★ 서버 데이터가 있으면 좌표 업데이트 (없으면 기존 유지)
                const rX = data.X || data.x;
                const rY = data.Y || data.y;
                if (rX && rY) {
                    setCoord({ x: parseFloat(rX), y: parseFloat(rY) });
                }

                if (data.tagStats || data.TagStats) {
                    const stats = data.tagStats || data.TagStats;
                    const newStats = {};
                    PREDEFINED_TAGS.forEach(t => newStats[t] = { count: 0, active: false });
                    stats.forEach(item => { newStats[item.tag] = { count: item.count, active: item.isActive }; });
                    setTagStats(newStats);
                }

                const serverComments = data.Comments || data.comments || [];
                setComments(serverComments);

                const cName = data.creatorName || data.CreatorName || "정보 없음";
                const cId = data.creatorId || data.CreatorId;
                const cLikes = data.creatorLikes || data.CreatorLikes || 0;
                const eName = data.lastEditorName || data.LastEditorName || "정보 없음";
                const eId = data.lastEditorId || data.LastEditorId;
                const eLikes = data.authorLikes || data.AuthorLikes || 0;

                setCreator({ name: cName, id: cId, likes: cLikes });
                setEditor({ name: eName, id: eId, likes: eLikes });
                setUpdatedAt(data.updatedAt || data.UpdatedAt);
            }
        } catch (error) { console.log("데이터 로딩 중 에러"); } finally { setLoading(false); }
    };

    const checkBookmarkStatus = async () => {
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) return;
        try {
            const response = await axios.get(`${apiUrl}/api/user/${storedUserId}`);
            const bookmarks = response.data.bookmarks || response.data.Bookmarks || [];
            const isExist = bookmarks.some(b => (b.restaurantId || b.RestaurantId) === id);
            setIsBookmarked(isExist);
        } catch (e) { console.error("찜 확인 실패", e); }
    };

    useEffect(() => { fetchWiki(); checkBookmarkStatus(); }, [id, apiUrl]);

    // ... (Like, Bookmark, Tag, Ack, Save, History, Rollback, Comment, Image, Lock 함수들 기존 유지)
    const handleLike = async () => {
        if (!isLoggedIn) return alert("로그인이 필요합니다.");
        if (!editor.id) return alert("추천할 기여자가 없습니다.");
        try {
            const response = await axios.post(`${apiUrl}/api/wiki/like`, { restaurantId: id, nickname: myNickname, targetUserId: editor.id });
            const newCount = response.data.newLikeCount ?? response.data.NewLikeCount;
            const newLikedState = response.data.isLiked ?? response.data.IsLiked;
            setLikeCount(newCount);
            setIsLiked(newLikedState);
            setEditor(prev => ({ ...prev, likes: newLikedState ? prev.likes + 1 : prev.likes - 1 }));
        } catch (error) { alert("오류 발생"); }
    };
    const handleBookmark = async () => {
        if (!isLoggedIn) { if (window.confirm("로그인 필요. 이동?")) navigate('/login'); return; }
        try {
            const response = await axios.post(`${apiUrl}/api/wiki/bookmark`, { nickname: myNickname, restaurantId: id, restaurantName: restaurantName, address: restaurantAddress, x: coord.x, y: coord.y });
            setIsBookmarked(response.data.isBookmarked);
            alert(response.data.message);
        } catch (error) { alert("오류"); }
    };
    const handleTagClick = async (tag) => {
        if (!isLoggedIn) return alert("로그인 필요");
        setTagStats(prev => {
            const current = prev[tag] || { count: 0, active: false };
            const newActive = !current.active;
            const newCount = newActive ? current.count + 1 : current.count - 1;
            return { ...prev, [tag]: { count: newCount, active: newActive } };
        });
        try { await axios.post(`${apiUrl}/api/wiki/tag`, { restaurantId: id, nickname: myNickname, tag: tag }); } catch (error) { fetchWiki(); }
    };
    const handleAck = async () => {
        if (!isLoggedIn) return alert("로그인 필요");
        try {
            const response = await axios.post(`${apiUrl}/api/wiki/ack`, { restaurantId: id, nickname: myNickname });
            const newCount = response.data.newAckCount ?? response.data.NewAckCount ?? ackCount + 1;
            setAckCount(newCount);
            alert("🔥 맛집 인정 완료!");
        } catch (error) { if (error.response && error.response.data) alert(error.response.data); else alert("오류 발생"); }
    };
    const handleSave = async () => {
        if (!isLoggedIn) return alert("로그인 필요");
        try {
            await axios.post(`${apiUrl}/api/wiki`, { restaurantId: id, restaurantName, address: restaurantAddress, content, nickname: myNickname, x: coord.x, y: coord.y });
            alert("저장되었습니다!"); fetchWiki();
        } catch (error) { alert("저장 실패"); }
    };
    const fetchHistory = async () => {
        if (showHistory) { setShowHistory(false); return; }
        try { const res = await axios.get(`${apiUrl}/api/wiki/history/${id}`); setHistoryList(res.data); setShowHistory(true); } catch (e) { alert("실패"); }
    };
    const handleRollback = async (historyId) => {
        if (!window.confirm("복구?")) return;
        try { await axios.post(`${apiUrl}/api/wiki/rollback`, { historyId }); alert("복구 완료"); window.location.reload(); } catch (e) { alert("실패"); }
    };
    const handleAddComment = async () => {
        if (!isLoggedIn) return alert("로그인 후 이용해주세요.");
        if (!newComment.trim()) return;
        try {
            await axios.post(`${apiUrl}/api/wiki/comment`, { restaurantId: id, nickname: myNickname, content: newComment });
            setNewComment('');
            setVisibleCount(prev => prev + 1);
            fetchWiki();
        } catch (error) { console.error(error); alert("댓글 등록 실패"); }
    };
    const handleImageUpload = async (e) => {
        if (!isLoggedIn) return alert("로그인 후 사진을 올릴 수 있어요.");
        const file = e.target.files[0];
        if (!file) return;
        if (!myNickname) { alert("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요."); return; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("restaurantId", id);
        formData.append("nickname", myNickname);
        setLoading(true);
        try {
            await axios.post(`${apiUrl}/api/Upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            alert("사진이 등록되었습니다! 📸");
            fetchWiki();
        } catch (error) { console.error("업로드 에러 상세:", error.response?.data); alert(`업로드 실패: ${error.response?.data || "서버 응답 없음"}`); } finally { setLoading(false); }
    };
    const handleToggleLock = async () => {
        try {
            await axios.post(`${apiUrl}/api/wiki/${id}/lock`, !isLocked, { headers: { "Content-Type": "application/json" } });
            setIsLocked(!isLocked);
            alert(!isLocked ? "🔒 문서가 보호되었습니다." : "🔓 보호가 해제되었습니다.");
        } catch (e) { alert("잠금 설정 실패"); }
    };
    const handleDeleteImage = async (imgUrl) => {
        if (!window.confirm("정말 이 사진을 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`${apiUrl}/api/wiki/image`, { params: { imageUrl: imgUrl, restaurantId: id, nickname: myNickname } });
            alert("삭제되었습니다."); await fetchWiki();
        } catch (error) { console.error("삭제 통신 에러:", error); alert("삭제 실패: " + (error.response?.data || "네트워크 오류")); }
    };

    // ★ 지도 렌더링 Effect 개선
    useEffect(() => {
        // loading 상태여도 지도는 그릴 수 있으면 그림 (깜빡임 방지)
        if (!mapContainer.current || !window.kakao) return;

        window.kakao.maps.load(() => {
            // coord 상태값 사용
            const centerLat = parseFloat(coord.y);
            const centerLng = parseFloat(coord.x);
            
            const options = { 
                center: new window.kakao.maps.LatLng(centerLat, centerLng), 
                level: 3 
            };
            const map = new window.kakao.maps.Map(mapContainer.current, options);
            
            // 마커 표시
            const markerPosition = new window.kakao.maps.LatLng(centerLat, centerLng);
            const marker = new window.kakao.maps.Marker({ position: markerPosition });
            marker.setMap(map);
            
            // 줌 컨트롤 추가 (선택사항)
            // const zoomControl = new window.kakao.maps.ZoomControl();
            // map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
        });
    }, [coord]); // coord가 변경될 때만 재실행

    if (loading && !restaurantName) return <div className="text-center" style={{ padding: '50px' }}>로딩 중... ⏳</div>;

    return (
        <div className="page-container">
            {/* ... (기존 JSX 구조 유지) */}
            
            {/* 0. 상단 이미지 갤러리 */}
            <div style={{ width: '100%', height: '250px', backgroundColor: '#f0f0f0', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {images.length > 0 ? (
                    <div style={{ display: 'flex', overflowX: 'auto', width: '100%', height: '100%', scrollSnapType: 'x mandatory' }}>
                        {images.map((imgUrl, idx) => (
                            <div key={idx} style={{ minWidth: '100%', height: '100%', position: 'relative', flexShrink: 0 }}>
                                <img src={imgUrl} alt="음식" style={{ width: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'start' }} />
                                {isAdmin && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(imgUrl); }} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255, 0, 0, 0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                                )}
                            </div>
                        ))}
                        <div style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', zIndex: 15 }}>📸 {images.length}장</div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#aaa' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
                        <div>첫 번째 사진을 올려주세요!</div>
                    </div>
                )}
                <button onClick={() => fileInputRef.current.click()} style={{ position: 'absolute', bottom: '15px', right: '15px', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FF5722', color: 'white', border: 'none', fontSize: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 10 }} title="사진 업로드">+</button>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>

            {/* 1. 헤더 */}
            <div className="wiki-header">
                <h1 style={{ margin: '0 0 5px 0', fontSize: '22px' }}>{restaurantName || "식당 정보 없음"}{isLocked && <span style={{ marginLeft: '8px', fontSize: '16px' }}>🔒</span>}{isAdmin && (<button onClick={handleToggleLock} style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }} className="tag-btn">{isLocked ? "보호 해제" : "문서 보호"}</button>)}</h1>
                <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '14px' }}>{restaurantAddress}</p>
                <div className="wiki-score-board">
                    <div className="score-item"><span className="score-value">🔥 {ackCount}</span><span className="score-label">맛집 인정</span></div>
                    <div className="score-item"><span className="score-value" style={{ color: '#673AB7' }}>💜 {likeCount}</span><span className="score-label">에디터 추천</span></div>
                </div>
            </div>

            {/* 2. 액션 버튼 */}
            <div className="action-buttons">
                <button onClick={handleBookmark} className={`btn-action ${isBookmarked ? 'active' : ''}`}>{isBookmarked ? '❤️' : '🤍'} 찜하기</button>
                <button onClick={handleAck} className="btn-action" style={{ color: '#E65100' }}>🔥 인정하기</button>
            </div>

            {/* 3. 태그 */}
            <div className="restaurant-card">
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>🏷️ 특징 투표</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PREDEFINED_TAGS.map(tag => {
                        const info = tagStats[tag] || { count: 0, active: false };
                        return (
                            <button key={tag} onClick={() => handleTagClick(tag)} className={`tag-btn ${info.active ? 'active' : ''}`}>
                                {tag} {info.count > 0 && <span>{info.count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. 지도 */}
            <div style={{ width: '100%', height: '250px', marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #eee' }}>
                <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>
            </div>

            {/* 5. 위키 내용 (기여자) */}
            {(creator.id || editor.id) && (
                <div className="restaurant-card" style={{ padding: '0' }}>
                    <div className="profile-card" onClick={() => creator.id && navigate(`/author/${creator.id}`)}>
                        <div className="rank-badge">🚩</div>
                        <div className="profile-info">
                            <div className="profile-name">{creator.name} <ReputationBadge count={creator.likes} /></div>
                            <div className="profile-meta">최초 발견자</div>
                        </div>
                    </div>
                    <div className="profile-card" style={{ borderBottom: 'none' }}>
                        <div className="rank-badge">✍️</div>
                        <div className="profile-info" onClick={() => editor.id && navigate(`/author/${editor.id}`)}>
                            <div className="profile-name" style={{ color: '#673AB7' }}>{editor.name} <ReputationBadge count={editor.likes} /></div>
                            <div className="profile-meta">최근 업데이트 ({formatDate(updatedAt)})</div>
                        </div>
                        <button onClick={handleLike} className={`tag-btn ${isLiked ? 'active' : ''}`} style={{ marginLeft: 'auto' }}>{isLiked ? '취소' : '추천'}</button>
                    </div>
                </div>
            )}

            {/* 위키 에디터 */}
            <h3 style={{ fontSize: '18px', margin: '30px 0 15px', fontWeight: '800', color: '#333' }}>📝 위키 집필 (Wiki Editor)</h3>
            <div className="wiki-editor-card">
                <div className="editor-toolbar" style={{ opacity: (isLocked && !isAdmin) ? 0.5 : 1, pointerEvents: (isLocked && !isAdmin) ? 'none' : 'auto' }}>
                    <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center', marginRight: '5px' }}>{isLocked && !isAdmin ? "🔒 보호 모드:" : "양식 추가:"}</span>
                    {["영업시간", "추천메뉴", "주차정보", "웨이팅팁", "화장실", "인원"].map(label => (
                        <button key={label} className="template-chip" onClick={() => handleTemplateClick(label)} disabled={isLocked && !isAdmin} style={{ cursor: (isLocked && !isAdmin) ? 'not-allowed' : 'pointer', filter: (isLocked && !isAdmin) ? 'grayscale(1)' : 'none' }}>{label}</button>
                    ))}
                </div>
                <textarea id="wiki-editor" className="wiki-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder={`이 식당의 정보를 함께 채워주세요!\n\n(예시)\n🕒 영업시간: 매일 11:00 ~ 21:00\n🚗 주차: 가게 앞 2대 가능\n🍽️ 추천: 치즈 돈까스가 정말 맛있어요!`} disabled={isLocked && !isAdmin} />
            </div>
            <button onClick={handleSave} className="btn-primary" disabled={isLocked && !isAdmin} style={{ marginBottom: '40px', opacity: (isLocked && !isAdmin) ? 0.5 : 1, filter: (isLocked && !isAdmin) ? 'grayscale(1)' : 'none' }}>{isLocked && !isAdmin ? "🔒 보호된 문서입니다" : "✨ 위키 저장하기"}</button>

            {/* 6. 댓글 영역 */}
            <div className="comment-section">
                <h3 style={{ fontSize: '16px', margin: '0 0 15px' }}>💬 실시간 톡 ({comments.length})</h3>
                <div className="comment-input-area">
                    <input className="comment-input" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder={isLoggedIn ? "이 식당에 대한 이야기를 나눠보세요!" : "로그인 후 대화에 참여해보세요."} disabled={!isLoggedIn} />
                    <button className="btn-send" onClick={handleAddComment}>➜</button>
                </div>
                <ul className="comment-list">
                    {comments.slice(0, visibleCount).map((c) => (
                        <li key={c.id} className="comment-item">
                            <div className="comment-avatar">{c.nickname ? c.nickname.charAt(0) : '?'}</div>
                            <div>
                                <div className="comment-bubble"><strong>{c.nickname || "익명"}</strong>: {c.content}</div>
                                <span className="comment-meta">{c.createdAt ? formatTime(c.createdAt) : "방금 전"}</span>
                            </div>
                        </li>
                    ))}
                    {(!comments || comments.length === 0) && (<p style={{ color: '#999', fontSize: '13px', padding: '10px' }}>첫 번째 댓글을 남겨보세요! 👋</p>)}
                </ul>
                {comments.length > visibleCount && (
                    <button onClick={() => setVisibleCount(prev => prev + 5)} style={{ width: '100%', padding: '10px', marginTop: '10px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '12px', color: '#666', fontWeight: 'bold', cursor: 'pointer' }}>⬇️ 댓글 더보기 ({comments.length - visibleCount}개 남음)</button>
                )}
            </div>

            {/* 7. 타임머신 (관리자 전용) */}
            {isAdmin && (
                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <button onClick={fetchHistory} className="btn" style={{ fontSize: '13px', color: '#888' }}>🕰️ 수정 내역 (관리자 권한)</button>
                    {showHistory && historyList.map(h => (
                        <div key={h.id} onClick={() => { setSelectedContent(h.content); setIsModalOpen(true); }} style={{ padding: '12px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Ver.{h.version}</span>
                                <span style={{ fontSize: '11px', color: '#999' }}>{formatDate(h.archivedAt)}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleRollback(h.id); }} className="tag-btn" style={{ padding: '4px 8px', fontSize: '11px' }}>복구</button>
                        </div>
                    ))}
                </div>
            )}

            {/* 히스토리 미리보기 팝업 (모달) */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', width: '90%', maxHeight: '70%', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 15px' }}>📄 버전 미리보기</h4>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: '#444', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            {selectedContent || "내용이 없습니다."}
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="btn-primary" style={{ marginTop: '20px' }}>닫기</button>
                    </div>
                </div>
            )}

            {/* 관리자 전용 이미지 관리 섹션 */}
            {isAdmin && (
                <div className="restaurant-card" style={{ marginTop: '40px', border: '2px solid #ffebee' }}>
                    <h3 style={{ fontSize: '16px', color: '#d32f2f', marginBottom: '15px', display: 'flex', alignItems: 'center' }}><span style={{ marginRight: '8px' }}>🛠️</span> 이미지 통합 관리 (관리자 전용)</h3>
                    {images.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                            {images.map((url, idx) => (
                                <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    <img src={url} alt={`관리용-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => handleDeleteImage(url)} style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(211, 47, 47, 0.9)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>삭제</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#999', fontSize: '13px' }}>등록된 이미지가 없습니다.</p>
                    )}
                    <p style={{ marginTop: '15px', fontSize: '11px', color: '#999' }}>※ 삭제 시 하드웨어 DB와 Storage에서 즉시 영구 삭제되어 용량이 확보됩니다.</p>
                </div>
            )}
        </div>
    );
}

export default WikiPage;