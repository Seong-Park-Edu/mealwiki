import RankingBoard from '../components/RankingBoard';
import axios from 'axios';

const ParticleSurvivalPage = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    // 앱 접속 여부 판단
    const [isApp, setIsApp] = useState(false);
    useEffect(() => {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('MealWikiApp') !== -1 || !!window.ReactNativeWebView) {
            setIsApp(true);
        }
    }, []);

    // 게임 상태 (UI 표시용)
    const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
    const [survivedTime, setSurvivedTime] = useState(0);
    const [lifeTime, setLifeTime] = useState(4.0); // 기본 생명 4초로 변경
    const [currentPattern, setCurrentPattern] = useState("1단계: 가로 입자");

    // 랭킹 관련 상태
    const [nickname, setNickname] = useState("");
    const [isRankSubmitted, setIsRankSubmitted] = useState(false);
    const [refreshRanking, setRefreshRanking] = useState(0); // 랭킹 보드 새로고침용

    // ★ [핵심 수정] 게임 로직용 Refs (실시간 값 추적용)
    const lifeTimeRef = useRef(4.0);
    const isGameOverRef = useRef(false);

    // 이스터에그 상태
    const [titleClickCount, setTitleClickCount] = useState(0);

    // 게임 루프 Refs
    const requestRef = useRef();
    const startTimeRef = useRef(0);
    const lastTimeRef = useRef(0);
    const playerRef = useRef({ x: 200, y: 300, radius: 8 });
    const particlesRef = useRef([]);
    const lastTouchRef = useRef({ x: 0, y: 0 }); // 마지막 터치 위치 저장용

    // 화면 크기
    const CANVAS_WIDTH = Math.min(window.innerWidth - 60, 400);
    const CANVAS_HEIGHT = 400;

    const random = (min, max) => Math.random() * (max - min) + min;

    // ★ 랭킹 등록 핸들러
    const submitRanking = async () => {
        if (!nickname.trim()) {
            alert("닉네임을 입력해주세요!");
            return;
        }

        try {
            // API 주소는 환경에 따라 다를 수 있음 (RankingBoard와 동일하게 맞춤)
            await axios.post('https://mealwiki.com/api/gameranking', {
                nickname: nickname,
                score: parseFloat(survivedTime)
            });

            alert("랭킹이 등록되었습니다!");
            setIsRankSubmitted(true);
            setRefreshRanking(prev => prev + 1); // 랭킹 보드 갱신 트리거
        } catch (error) {
            console.error("Ranking submit failed:", error);
            alert("랭킹 등록에 실패했습니다.");
        }
    };

    // ★ 이스터에그 핸들러
    const handleTitleClick = () => {
        setTitleClickCount(prev => {
            const newCount = prev + 1;
            if (newCount === 10) {
                alert("😈 개발자 모드: 다음 게임 생명이 10초로 적용됩니다!");
            }
            return newCount;
        });
    };

    // ★ 게임 시작
    const startGame = () => {
        // 1. 상태 초기화
        setGameState('playing');
        setSurvivedTime(0);
        setIsRankSubmitted(false); // 랭킹 제출 상태 초기화

        const startLife = titleClickCount >= 10 ? 10.0 : 4.0;

        setLifeTime(startLife);
        setCurrentPattern("1단계: 가로 입자");

        // 2. Ref 즉시 초기화 (재시작 버그 해결 핵심)
        lifeTimeRef.current = startLife;
        isGameOverRef.current = false;

        // 3. 게임 엔티티 초기화
        particlesRef.current = [];
        playerRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, radius: 8 };

        // 4. 타이머 초기화
        startTimeRef.current = performance.now();
        lastTimeRef.current = performance.now();

        // 5. 기존 루프 취소 후 재시작
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    // ★ 입자 생성 로직
    const spawnParticle = (elapsedTime) => {
        const seconds = elapsedTime / 1000;
        let types = ['horizontal'];

        if (seconds > 10) types.push('vertical');
        if (seconds > 20) types.push('diagonal');
        if (seconds > 30) types.push('parabola');
        if (seconds > 40) types.push('snowflake');
        if (seconds > 50) types.push('h-line');
        if (seconds > 60) types.push('v-line');
        if (seconds > 70) types.push('d-line');
        if (seconds > 80) types.push('p-line');
        if (seconds > 90) types.push('snake');
        if (seconds > 100) types.push('h-area');
        if (seconds > 110) types.push('v-area');
        if (seconds > 120) types.push('d-area');
        if (seconds > 130) types.push('spiral');
        if (seconds > 140) types.push('surface');

        const baseChance = 0.2 + (seconds * 0.01);
        const spawnChance = Math.min(1.0, baseChance * 0.2);

        if (seconds > 140 && Math.random() > 0.3) {
            // 최종장에서는 난이도 조절 (너무 많이 나오면 불가능)
        } else if (Math.random() > spawnChance) {
            return;
        }

        const lastType = types[types.length - 1];
        let patternName = "";
        switch (lastType) {
            case 'horizontal': patternName = "1단계: 가로 입자"; break;
            case 'vertical': patternName = "2단계: +세로 입자"; break;
            case 'diagonal': patternName = "3단계: +대각선"; break;
            case 'parabola': patternName = "4단계: +포물선"; break;
            case 'snowflake': patternName = "5단계: +눈송이"; break;
            case 'h-line': patternName = "6단계: +가로 레이저"; break;
            case 'v-line': patternName = "7단계: +세로 레이저"; break;
            case 'd-line': patternName = "8단계: +대각 레이저"; break;
            case 'p-line': patternName = "9단계: +곡선 레이저"; break;
            case 'snake': patternName = "10단계: +유도 지렁이"; break;
            case 'h-area': patternName = "11단계: +가로 '면'공격"; break;
            case 'v-area': patternName = "12단계: +세로 '면'공격"; break;
            case 'd-area': patternName = "13단계: +대각 '면'공격"; break;
            case 'spiral': patternName = "14단계: +나선환"; break;
            case 'surface': patternName = "최종장: +공간 왜곡(면)"; break;
            default: patternName = "생존 중...";
        }
        setCurrentPattern(patternName);

        const type = types[Math.floor(Math.random() * types.length)];
        let p = {
            type,
            x: 0, y: 0,
            vx: 0, vy: 0,
            size: 4,
            color: '#555',
            history: [],
            t: 0
        };

        // ★ [속도 조절] 여기서 숫자를 낮췄습니다. (기존 3~8 -> 2~5)
        const speed = random(2, 5);

        switch (type) {
            case 'horizontal':
                p.y = random(0, CANVAS_HEIGHT);
                p.x = Math.random() < 0.5 ? 0 : CANVAS_WIDTH;
                p.vx = p.x === 0 ? speed : -speed;
                p.color = '#FF5722';
                break;
            case 'vertical':
                p.x = random(0, CANVAS_WIDTH);
                p.y = Math.random() < 0.5 ? 0 : CANVAS_HEIGHT;
                p.vy = p.y === 0 ? speed : -speed;
                p.color = '#2196F3';
                break;
            case 'diagonal':
                if (Math.random() < 0.5) {
                    p.x = Math.random() < 0.5 ? 0 : CANVAS_WIDTH;
                    p.y = random(0, CANVAS_HEIGHT);
                    p.vx = p.x === 0 ? speed : -speed;
                    p.vy = random(-speed, speed);
                } else {
                    p.x = random(0, CANVAS_WIDTH);
                    p.y = Math.random() < 0.5 ? 0 : CANVAS_HEIGHT;
                    p.vx = random(-speed, speed);
                    p.vy = p.y === 0 ? speed : -speed;
                }
                p.color = '#9C27B0';
                break;
            case 'parabola':
                p.x = Math.random() < 0.5 ? 0 : CANVAS_WIDTH;
                p.y = CANVAS_HEIGHT - 50;
                p.vx = p.x === 0 ? random(1, 3) : random(-3, -1); // 속도 낮춤
                p.vy = random(-7, -5); // 속도 낮춤
                p.gravity = 0.2;
                p.color = '#4CAF50';
                break;
            case 'snowflake':
                p.x = random(0, CANVAS_WIDTH);
                p.y = -10;
                p.vy = random(1.5, 3.5); // 속도 낮춤
                p.vx = 0;
                p.sway = random(0.05, 0.15);
                p.color = '#00BCD4';
                break;
            case 'h-line':
            case 'v-line':
            case 'd-line':
            case 'p-line':
            case 'h-area': // New
            case 'v-area': // New
            case 'd-area': // New
                p.isLine = true;
                p.length = 200;

                // 면 공격은 두께 2배
                if (type.includes('area')) {
                    p.lineWidth = 15;
                    p.color = '#E91E63'; // 붉은 계열 강조
                } else {
                    p.lineWidth = 4;
                }

                if (type === 'h-line' || type === 'h-area') {
                    p.y = random(0, CANVAS_HEIGHT);
                    p.x = Math.random() < 0.5 ? -200 : CANVAS_WIDTH + 200;
                    p.vx = p.x < 0 ? speed * 1.2 : -speed * 1.2;
                    if (!type.includes('area')) p.color = '#F44336';
                } else if (type === 'v-line' || type === 'v-area') {
                    p.x = random(0, CANVAS_WIDTH);
                    p.y = Math.random() < 0.5 ? -200 : CANVAS_HEIGHT + 200;
                    p.vy = p.y < 0 ? speed * 1.2 : -speed * 1.2;
                    if (!type.includes('area')) p.color = '#F44336';
                } else if (type === 'd-line' || type === 'd-area') {
                    p.x = Math.random() < 0.5 ? -200 : CANVAS_WIDTH + 200;
                    p.y = random(0, CANVAS_HEIGHT);
                    p.vx = p.x < 0 ? speed : -speed;
                    p.vy = speed;
                    if (!type.includes('area')) p.color = '#F44336';
                } else { // p-line
                    p.x = Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50;
                    p.y = CANVAS_HEIGHT;
                    p.vx = p.x < 0 ? 2 : -2;
                    p.vy = -6;
                    p.gravity = 0.15;
                    p.color = '#F44336';
                }
                break;
            case 'snake':
                // 화면 끝에서 생성 (무작위 4면 중 하나)
                if (Math.random() < 0.5) {
                    p.x = Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50;
                    p.y = random(0, CANVAS_HEIGHT);
                } else {
                    p.x = random(0, CANVAS_WIDTH);
                    p.y = Math.random() < 0.5 ? -50 : CANVAS_HEIGHT + 50;
                }

                const dx = playerRef.current.x - p.x;
                const dy = playerRef.current.y - p.y;
                const angle = Math.atan2(dy, dx);

                // 초기 속도 설정
                p.vx = Math.cos(angle) * 3;
                p.vy = Math.sin(angle) * 3;

                p.history = [];
                p.size = 6;
                p.color = '#FFEB3B';
                p.homingTime = 30; // 0.5초 유도 (60fps 기준)
                break;
            case 'spiral': // 나선환
                p.x = CANVAS_WIDTH / 2;
                p.y = CANVAS_HEIGHT / 2; // 중앙 생성
                p.radius = 0;
                p.angle = random(0, Math.PI * 2);
                p.angularSpeed = 0.1;
                p.radialSpeed = 2;
                p.size = 5;
                p.color = '#9C27B0';
                break;
            case 'surface':
                p.x = random(0, CANVAS_WIDTH);
                p.y = random(0, CANVAS_HEIGHT);
                p.vx = random(-0.5, 0.5); // 아주 천천히
                p.vy = random(-0.5, 0.5);
                p.size = 10;
                p.maxSize = random(50, 150);
                p.growthRate = random(0.3, 1.5);
                p.color = `rgba(${random(50, 200)}, 0, ${random(150, 255)}, 0.4)`;
                break;
            default: break;
        }

        particlesRef.current.push(p);
    };

    // ★ 게임 루프
    const gameLoop = (timestamp) => {
        // 이미 게임오버 상태라면 루프 중단 (안전장치)
        if (isGameOverRef.current) return;

        const deltaTime = timestamp - lastTimeRef.current;
        const elapsedTime = timestamp - startTimeRef.current;
        lastTimeRef.current = timestamp;

        setSurvivedTime((elapsedTime / 1000).toFixed(2));

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        spawnParticle(elapsedTime);

        // 플레이어
        ctx.beginPath();
        ctx.arc(playerRef.current.x, playerRef.current.y, playerRef.current.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.closePath();

        // 생명력 테두리
        ctx.beginPath();
        ctx.arc(playerRef.current.x, playerRef.current.y, playerRef.current.radius + 3, 0, Math.PI * 2);
        // ★ Ref 값을 기준으로 색상 표시
        ctx.strokeStyle = lifeTimeRef.current < 0.3 ? 'red' : '#4CAF50';
        ctx.lineWidth = 2;
        ctx.stroke();

        let isColliding = false;

        particlesRef.current.forEach((p) => {
            // 위치 업데이트
            if (p.type === 'parabola' || p.type === 'p-line') {
                p.vy += p.gravity;
            }
            if (p.type === 'snowflake') {
                p.t = (p.t || 0) + 0.1;
                p.vx = Math.sin(p.t) * 2;
            }
            if (p.type === 'snake') {
                p.history.push({ x: p.x, y: p.y });
                if (p.history.length > 20) p.history.shift();

                // 일정 시간동안만 플레이어 방향으로 유도
                if (p.homingTime > 0) {
                    p.homingTime--;
                    const dx = playerRef.current.x - p.x;
                    const dy = playerRef.current.y - p.y;
                    const angle = Math.atan2(dy, dx);

                    // 유도 성능 (기존 유지)
                    p.vx = p.vx * 0.96 + Math.cos(angle) * 0.2;
                    p.vy = p.vy * 0.96 + Math.sin(angle) * 0.2;
                }
            }
            if (p.type === 'surface') {
                if (p.size < p.maxSize) {
                    p.size += p.growthRate;
                }
            }

            p.x += p.vx;
            p.y += p.vy;

            // 그리기
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;

            let hit = false;

            if (p.type === 'snake') {
                if (p.history.length > 0) {
                    ctx.moveTo(p.history[0].x, p.history[0].y);
                    for (let i = 1; i < p.history.length; i++) {
                        ctx.lineTo(p.history[i].x, p.history[i].y);
                    }
                    ctx.lineWidth = p.size;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                const dist = Math.hypot(p.x - playerRef.current.x, p.y - playerRef.current.y);
                if (dist < p.size + playerRef.current.radius) hit = true;

            } else if (p.isLine) {
                const angle = Math.atan2(p.vy, p.vx);
                const startX = p.x;
                const startY = p.y;
                const endX = p.x - Math.cos(angle) * p.length;
                const endY = p.y - Math.sin(angle) * p.length;

                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = p.lineWidth;
                ctx.stroke();

                hit = distToSegment({ x: playerRef.current.x, y: playerRef.current.y }, { x: startX, y: startY }, { x: endX, y: endY }) < (playerRef.current.radius + p.lineWidth / 2);

            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                const dist = Math.hypot(p.x - playerRef.current.x, p.y - playerRef.current.y);
                if (dist < p.size + playerRef.current.radius) hit = true;
            }

            if (hit) {
                isColliding = true;
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(playerRef.current.x, playerRef.current.y, 20, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        particlesRef.current = particlesRef.current.filter(p =>
            p.x > -200 && p.x < CANVAS_WIDTH + 200 &&
            p.y > -200 && p.y < CANVAS_HEIGHT + 200
        );

        // 데미지 처리
        if (isColliding) {
            const damage = deltaTime / 1000;

            // ★ [핵심 수정] Ref 값을 먼저 깎고, 그 값을 State에 반영
            // 이렇게 해야 로직은 Ref를 보고 즉시 반응하고, UI는 State를 보고 렌더링함
            lifeTimeRef.current -= damage;
            setLifeTime(lifeTimeRef.current);

            if (lifeTimeRef.current <= 0) {
                cancelAnimationFrame(requestRef.current);
                setGameState('gameover');
                isGameOverRef.current = true; // 게임 오버 플래그 설정
                return;
            }
        }

        // ★ Ref 값을 체크해서 루프 지속 여부 결정
        if (!isGameOverRef.current) {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    };

    // ★ [신규 추가] 터치 시작 시 좌표 초기화
    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
            lastTouchRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    };

    // 터치 시 손가락 위로 띄울 간격 (픽셀)
    const TOUCH_OFFSET_Y = 80;

    // ★ [수정] 트랙패드 방식의 입력 핸들러
    const handleInput = (e) => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // 화면 비율 계산
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 1. 터치 조작 (상대 좌표 이동)
        if (e.type.includes('touch')) {
            if (!e.touches || e.touches.length === 0) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            // 이동한 거리 계산 (현재 좌표 - 이전 좌표)
            const deltaX = (currentX - lastTouchRef.current.x) * scaleX; // 감도 조절하려면 뒤에 * 1.2 등 추가
            const deltaY = (currentY - lastTouchRef.current.y) * scaleY;

            // 플레이어 위치 업데이트
            let newX = playerRef.current.x + deltaX;
            let newY = playerRef.current.y + deltaY;

            // 화면 밖 제한
            const radius = playerRef.current.radius;
            newX = Math.max(radius, Math.min(newX, CANVAS_WIDTH - radius));
            newY = Math.max(radius, Math.min(newY, CANVAS_HEIGHT - radius));

            playerRef.current = { ...playerRef.current, x: newX, y: newY };

            // 현재 위치를 '이전 위치'로 갱신
            lastTouchRef.current = { x: currentX, y: currentY };
        }
        // 2. 마우스 조작 (기존과 동일하게 절대 좌표 유지 - PC에서는 이게 편함)
        else {
            let x = (e.clientX - rect.left) * scaleX;
            let y = (e.clientY - rect.top) * scaleY;
            const radius = playerRef.current.radius;
            x = Math.max(radius, Math.min(x, CANVAS_WIDTH - radius));
            y = Math.max(radius, Math.min(y, CANVAS_HEIGHT - radius));
            playerRef.current = { ...playerRef.current, x, y };
        }
    };

    function distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    return (
        <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
            <h1
                onClick={handleTitleClick}
                style={{ fontSize: '24px', marginBottom: '10px', cursor: 'pointer', userSelect: 'none' }}
            >
                ☠️ 극한의 생존 게임
            </h1>
            <p style={{ color: '#666', marginBottom: '15px' }}>
                입자에 닿으면 생명이 줄어듭니다! (단 {titleClickCount >= 10 ? 10 : 4}초)
            </p>

            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                maxWidth: `${CANVAS_WIDTH}px`, margin: '0 auto 10px auto',
                padding: '10px', backgroundColor: '#eee', borderRadius: '8px'
            }}>
                <div>
                    <div style={{ fontSize: '12px', color: '#555' }}>생존 시간</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{survivedTime}초</div>
                </div>
                <div style={{ textAlign: 'center', color: '#E91E63', fontWeight: 'bold' }}>
                    {currentPattern}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#555' }}>남은 생명</div>
                    <div style={{
                        fontSize: '20px', fontWeight: 'bold',
                        color: lifeTime < 0.3 ? 'red' : '#4CAF50'
                    }}>
                        {lifeTime.toFixed(2)}s
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onTouchStart={handleTouchStart}
                    onMouseMove={handleInput}
                    onTouchMove={handleInput}
                    style={{
                        border: '2px solid #333',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'none',
                        touchAction: 'none',
                        maxWidth: '100%',
                        height: 'auto',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                />

                {gameState === 'ready' && (
                    <div style={overlayStyle}>
                        <h2>준비되셨나요?</h2>
                        <p>생명은 단 1초입니다!</p>
                        <button onClick={startGame} style={btnStyle}>게임 시작</button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div style={overlayStyle}>
                        <h2 style={{ color: 'red' }}>사망하셨습니다 ☠️</h2>
                        <p>당신의 기록: <strong>{survivedTime}초</strong></p>

                        {/* 랭킹 등록 폼 */}
                        {!isRankSubmitted ? (
                            <div style={{ margin: '15px 0', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="닉네임 입력 (최대 10자)"
                                    value={nickname}
                                    maxLength={10}
                                    onChange={(e) => setNickname(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '4px', border: 'none', marginRight: '5px' }}
                                />
                                <button onClick={submitRanking} style={{ padding: '8px 12px', backgroundColor: '#E91E63', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    등록
                                </button>
                            </div>
                        ) : (
                            <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>랭킹 등록 완료!</p>
                        )}

                        <button onClick={startGame} style={btnStyle}>다시 도전</button>
                        <button onClick={() => navigate(-1)} style={{ ...btnStyle, backgroundColor: '#666', marginTop: '10px' }}>
                            나가기
                        </button>
                    </div>
                )}
            </div>

            {/* ★ 명예의 전당 (랭킹 보드) 추가 */}
            <RankingBoard refreshTrigger={refreshRanking} />

            {/* ★ 게임 화면 아래에 안전한 여백을 두고 광고 배치 */}
            {/* 중간 광고 */}
            <AdSenseUnit isApp={isApp} slotId="9116035434" />

        </div>
    );
};

const overlayStyle = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.75)', color: 'white',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    borderRadius: '4px'
};

const btnStyle = {
    padding: '12px 24px', fontSize: '18px', fontWeight: 'bold',
    backgroundColor: '#FF5722', color: 'white', border: 'none', borderRadius: '4px',
    cursor: 'pointer', marginTop: '15px'
};

export default ParticleSurvivalPage;

