import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const formatTime = (dateString) => new Date(dateString).toLocaleString(); // 시간까지 표시
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

    const [restaurantName, setRestaurantName] = useState(location.state?.name || "");
    const [restaurantAddress, setRestaurantAddress] = useState(location.state?.address || "");
    const [coord, setCoord] = useState({ x: location.state?.x, y: location.state?.y });

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5068';
    const mapContainer = useRef(null);

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

    // ★ 댓글 관련 상태
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    // ★ [1] 보여줄 댓글 개수 관리 (처음엔 6개만 보임)
    const [visibleCount, setVisibleCount] = useState(6);

    // ★ [추가] 이미지 관련 state
    const [images, setImages] = useState([]);
    const fileInputRef = useRef(null); // 숨겨진 파일 input 제어용


    // ★ [추가] 템플릿 버튼 클릭 핸들러
    const handleTemplateClick = (label) => {
        const template = `\n📌 ${label}: `;
        setContent(prev => prev + template);
        // 사용자 편의를 위해 포커스를 다시 textarea로 맞춤 (선택사항)
        document.getElementById('wiki-editor').focus();
    };

    useEffect(() => {
        const storedNickname = localStorage.getItem('nickname');
        const storedUserId = localStorage.getItem('userId');
        if (storedNickname && storedUserId) {
            setMyNickname(storedNickname);
            setIsLoggedIn(true);
        }
    }, []);

    const fetchWiki = async () => {
        try {
            const storedNickname = localStorage.getItem('nickname');
            // ★ 캐시 방지용 난수 추가 (&t=...)
            const query = storedNickname
                ? `?nickname=${storedNickname}&t=${new Date().getTime()}`
                : `?t=${new Date().getTime()}`;
            const response = await axios.get(`${apiUrl}/api/wiki/${id}${query}`);

            if (response.data) {
                const data = response.data;

                // ★ 이미지 데이터 설정
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
                const rX = data.X || data.x;
                const rY = data.Y || data.y;
                if (rX && rY) setCoord({ x: rX, y: rY });

                if (data.tagStats || data.TagStats) {
                    const stats = data.tagStats || data.TagStats;
                    const newStats = {};
                    PREDEFINED_TAGS.forEach(t => newStats[t] = { count: 0, active: false });
                    stats.forEach(item => { newStats[item.tag] = { count: item.count, active: item.isActive }; });
                    setTagStats(newStats);
                }

                // ★ 댓글 데이터 설정 (대소문자 완벽 방어)
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

    // ... (Like, Bookmark, Tag, Ack, Save 함수들은 기존 유지) ...
    // 편의상 이 부분은 생략 없이 그대로 둡니다.
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

    // ★ [2] 댓글 등록 시, 내가 쓴 글을 바로 볼 수 있게 펼쳐주기
    const handleAddComment = async () => {
        if (!isLoggedIn) return alert("로그인 후 이용해주세요.");
        if (!newComment.trim()) return;

        try {
            await axios.post(`${apiUrl}/api/wiki/comment`, {
                restaurantId: id,
                nickname: myNickname,
                content: newComment
            });
            setNewComment('');
            setVisibleCount(prev => prev + 1); // 댓글 달면 하나 더 보여줌
            fetchWiki();
        } catch (error) {
            console.error(error);
            alert("댓글 등록 실패");
        }
    };


    // ★ [추가] 이미지 업로드 핸들러
    const handleImageUpload = async (e) => {
        if (!isLoggedIn) return alert("로그인 후 사진을 올릴 수 있어요.");
        const file = e.target.files[0];
        if (!file) return;

        // FormData 만들기 (파일 전송용)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("restaurantId", id);
        formData.append("nickname", myNickname);

        setLoading(true);
        try {
            await axios.post(`${apiUrl}/api/wiki/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("사진이 등록되었습니다! 📸");
            fetchWiki(); // 새로고침해서 사진 보여주기
        } catch (error) {
            console.error(error);
            alert("업로드 실패 ㅠㅠ");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (loading || !mapContainer.current || !window.kakao) return;
        const draw = () => {
            mapContainer.current.innerHTML = '';
            let centerLat = parseFloat(coord.y) || 37.5665;
            let centerLng = parseFloat(coord.x) || 126.9780;
            const options = { center: new window.kakao.maps.LatLng(centerLat, centerLng), level: 3 };
            const map = new window.kakao.maps.Map(mapContainer.current, options);
            const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(centerLat, centerLng) });
            marker.setMap(map);
        };
        window.kakao.maps.load(draw);
    }, [coord, loading]);

    if (loading) return <div className="text-center" style={{ padding: '50px' }}>로딩 중... ⏳</div>;

    return (
        <div className="page-container">
            {/* <button onClick={() => navigate(-1)} className="btn" style={{ marginBottom: '10px', padding: '0', color: 'var(--text-sub)' }}>← 뒤로 가기</button> */}


            {/* ★ 0. 상단 이미지 갤러리 (새로 추가됨) */}
            <div style={{
                width: '100%', height: '250px', backgroundColor: '#f0f0f0', borderRadius: '16px',
                marginBottom: '20px', overflow: 'hidden', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {images.length > 0 ? (
                    // 이미지가 있을 때: 가로 스크롤 갤러리
                    <div style={{ display: 'flex', overflowX: 'auto', width: '100%', height: '100%', scrollSnapType: 'x mandatory' }}>
                        {images.map((imgUrl, idx) => (
                            <img key={idx} src={imgUrl} alt="음식"
                                style={{
                                    minWidth: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'start'
                                }}
                            />
                        ))}
                        {/* 사진 개수 표시 뱃지 */}
                        <div style={{
                            position: 'absolute', bottom: '15px', right: '15px',
                            background: 'rgba(0,0,0,0.6)', color: 'white',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px'
                        }}>
                            📸 {images.length}장
                        </div>
                    </div>
                ) : (
                    // 이미지가 없을 때: 안내 문구
                    <div style={{ textAlign: 'center', color: '#aaa' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
                        <div>첫 번째 사진을 올려주세요!</div>
                    </div>
                )}

                {/* 업로드 버튼 (우측 하단 플로팅) */}
                <button
                    onClick={() => fileInputRef.current.click()} // 숨겨진 input 클릭
                    style={{
                        position: 'absolute', bottom: '15px', right: '15px',
                        width: '50px', height: '50px', borderRadius: '50%',
                        backgroundColor: '#FF5722', color: 'white', border: 'none',
                        fontSize: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                        cursor: 'pointer', zIndex: 10
                    }}
                    title="사진 업로드"
                >
                    +
                </button>
                {/* 숨겨진 파일 선택창 */}
                <input
                    type="file" accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                />
            </div>

            {/* 1. 헤더 */}
            <div className="wiki-header">
                <h1 style={{ margin: '0 0 5px 0', fontSize: '22px' }}>{restaurantName || "식당 정보 없음"}</h1>
                <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '14px' }}>{restaurantAddress}</p>

                <div className="wiki-score-board">
                    <div className="score-item">
                        <span className="score-value">🔥 {ackCount}</span>
                        <span className="score-label">맛집 인정</span>
                    </div>
                    <div className="score-item">
                        <span className="score-value" style={{ color: '#673AB7' }}>💜 {likeCount}</span>
                        <span className="score-label">에디터 추천</span>
                    </div>
                </div>
            </div>

            {/* 2. 액션 버튼 */}
            <div className="action-buttons">
                <button onClick={handleBookmark} className={`btn-action ${isBookmarked ? 'active' : ''}`}>
                    {isBookmarked ? '❤️' : '🤍'} 찜하기
                </button>
                <button onClick={handleAck} className="btn-action" style={{ color: '#E65100' }}>
                    🔥 인정하기
                </button>
            </div>

            {/* 3. 태그 */}
            <div className="restaurant-card">
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>🏷️ 특징 투표</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PREDEFINED_TAGS.map(tag => {
                        const info = tagStats[tag] || { count: 0, active: false };
                        return (
                            <button key={tag} onClick={() => handleTagClick(tag)}
                                className={`tag-btn ${info.active ? 'active' : ''}`}
                            >
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
                        <button onClick={handleLike} className={`tag-btn ${isLiked ? 'active' : ''}`} style={{ marginLeft: 'auto' }}>
                            {isLiked ? '취소' : '추천'}
                        </button>
                    </div>
                </div>
            )}

            {/* ★ [수정됨] 위키 에디터 영역 */}
            <h3 style={{ fontSize: '18px', margin: '30px 0 15px', fontWeight: '800', color: '#333' }}>
                📝 위키 집필 (Wiki Editor)
            </h3>

            <div className="wiki-editor-card">
                {/* 1. 템플릿 툴바 */}
                <div className="editor-toolbar">
                    <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center', marginRight: '5px' }}>양식 추가:</span>
                    <button className="template-chip" onClick={() => handleTemplateClick("영업시간")}>영업시간</button>
                    <button className="template-chip" onClick={() => handleTemplateClick("추천메뉴")}>추천메뉴</button>
                    <button className="template-chip" onClick={() => handleTemplateClick("주차정보")}>주차정보</button>
                    <button className="template-chip" onClick={() => handleTemplateClick("웨이팅팁")}>웨이팅팁</button>
                    <button className="template-chip" onClick={() => handleTemplateClick("화장실")}>화장실</button>
                    <button className="template-chip" onClick={() => handleTemplateClick("인원")}>인원</button>
                </div>

                {/* 2. 텍스트 에디터 */}
                <textarea
                    id="wiki-editor"
                    className="wiki-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`이 식당의 정보를 함께 채워주세요!\n\n(예시)\n🕒 영업시간: 매일 11:00 ~ 21:00\n🚗 주차: 가게 앞 2대 가능\n🍽️ 추천: 치즈 돈까스가 정말 맛있어요!`}
                />
            </div>

            {/* 저장 버튼 (꽉 차게) */}
            <button onClick={handleSave} className="btn-primary" style={{ marginBottom: '40px', boxShadow: '0 4px 15px rgba(255,87,34, 0.3)' }}>
                ✨ 위키 저장하기
            </button>

            {/* ★ 6. 댓글 영역 (새로 추가됨) */}
            <div className="comment-section">
                <h3 style={{ fontSize: '16px', margin: '0 0 15px' }}>💬 실시간 톡 ({comments.length})</h3>

                {/* 댓글 입력 */}
                <div className="comment-input-area">
                    <input
                        className="comment-input"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder={isLoggedIn ? "이 식당에 대한 이야기를 나눠보세요!" : "로그인 후 대화에 참여해보세요."}
                        disabled={!isLoggedIn}
                    />
                    <button className="btn-send" onClick={handleAddComment}>
                        ➜
                    </button>
                </div>

                {/* 댓글 리스트 (수정된 안전한 코드) */}
                {/* ★ [3] 댓글 리스트 (slice 적용) */}
                <ul className="comment-list">
                    {comments.slice(0, visibleCount).map((c) => ( // 0번부터 visibleCount개까지만 자름
                        <li key={c.id} className="comment-item">
                            <div className="comment-avatar">
                                {c.nickname ? c.nickname.charAt(0) : '?'}
                            </div>
                            <div>
                                <div className="comment-bubble">
                                    <strong>{c.nickname || "익명"}</strong>: {c.content}
                                </div>
                                <span className="comment-meta">
                                    {c.createdAt ? formatTime(c.createdAt) : "방금 전"}
                                </span>
                            </div>
                        </li>
                    ))}

                    {(!comments || comments.length === 0) && (
                        <p style={{ color: '#999', fontSize: '13px', padding: '10px' }}>
                            첫 번째 댓글을 남겨보세요! 👋
                        </p>
                    )}
                </ul>

                {/* ★ [4] 더보기 버튼 (남은 댓글이 있을 때만 보임) */}
                {comments.length > visibleCount && (
                    <button
                        onClick={() => setVisibleCount(prev => prev + 5)} // 누르면 5개씩 더 보여줌
                        style={{
                            width: '100%', padding: '10px', marginTop: '10px',
                            backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '12px',
                            color: '#666', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        ⬇️ 댓글 더보기 ({comments.length - visibleCount}개 남음)
                    </button>
                )}
            </div>

            {/* 7. 타임머신 */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <button onClick={fetchHistory} className="btn" style={{ fontSize: '13px', color: '#888' }}>🕰️ 수정 내역</button>
                {showHistory && historyList.map(h => (
                    <div key={h.id} style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px' }}>Ver.{h.version} ({formatDate(h.archivedAt)})</span>
                        <button onClick={() => handleRollback(h.id)} className="tag-btn" style={{ padding: '4px 8px', fontSize: '11px' }}>복구</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WikiPage;