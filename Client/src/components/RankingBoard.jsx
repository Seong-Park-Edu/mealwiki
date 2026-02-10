import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RankingBoard = ({ refreshTrigger }) => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRankings = async () => {
        try {
            setLoading(true);
            // API 주소는 환경에 따라 다를 수 있으므로 상대 경로 또는 환경 변수 사용
            // 개발 환경에서는 package.json의 proxy 설정이나 vite.config.js 설정을 따름
            // 일단 직접 URL 호출 (배포 환경 고려 필요)
            // 배포 환경과 로컬 환경 모두 대응하기 위해 상대 경로 사용
            // (Vite proxy 또는 같은 도메인 배포 가정)
            const response = await axios.get('/api/gameranking');

            if (Array.isArray(response.data)) {
                setRankings(response.data);
            } else {
                console.error("Rankings data is invalid:", response.data);
                setRankings([]);
            }
        } catch (error) {
            console.error("Failed to fetch rankings:", error);
            // 에러 시 더미 데이터라도 보여줄지 결정
            // setRankings([]); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, [refreshTrigger]);

    // 날짜 포맷팅 함수 (KST 변환)
    const formatDate = (dateString) => {
        if (!dateString) return '-';

        // 데이터베이스(UTC) 시간을 정확히 인식하기 위해 보정
        // (만약 'Z'가 없으면 UTC로 간주하기 위해 추가)
        const isoString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        const date = new Date(isoString);

        // 한국 시간(KST)으로 변환된 날짜/시간 값 추출
        const options = {
            timeZone: 'Asia/Seoul',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        // en-US 로케일을 사용하면 숫자만 깔끔하게 추출 가능 (예: month="2", day="11")
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;

        return `${month}/${day} ${hour}:${minute}`;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>🏆 명예의 전당 (Top 10)</h2>
            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>순위</th>
                            <th style={styles.th}>닉네임</th>
                            <th style={styles.th}>생존 시간</th>
                            <th style={styles.th}>날짜</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((rank, index) => (
                            <tr key={rank.id || index} style={index < 3 ? styles.topRank : {}}>
                                <td style={styles.td}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </td>
                                <td style={styles.td}>{rank.nickname}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>{rank.score.toFixed(2)}초</td>
                                <td style={styles.td} className="mobile-hide">{formatDate(rank.createdAt)}</td>
                            </tr>
                        ))}
                        {rankings.length === 0 && (
                            <tr>
                                <td colSpan="4" style={styles.td}>아직 기록이 없습니다. 도전에 참여하세요!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const styles = {
    container: {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        margin: '30px auto'
    },
    title: {
        fontSize: '20px',
        marginBottom: '15px',
        color: '#333',
        textAlign: 'center'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
    },
    th: {
        borderBottom: '2px solid #eee',
        padding: '10px',
        color: '#666',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    td: {
        borderBottom: '1px solid #eee',
        padding: '10px',
        textAlign: 'center',
        color: '#333'
    },
    topRank: {
        backgroundColor: '#fffde7' // 상위 랭커 강조 배경색
    }
};

export default RankingBoard;
