import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
// html2canvas 제거됨
import './DecisionPage.css';

import catAnimation from '../assets/lottie/Cat-Playing.json';      
import successAnimation from '../assets/lottie/Success-celebration.json'; 
import failAnimation from '../assets/lottie/Stop-Button.json';       

export default function DecisionPage() {
  const [worry, setWorry] = useState('');
  const [ratio, setRatio] = useState(50);
  const [result, setResult] = useState(null); 
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState('BASIC'); 
  
  // captureRef 제거됨

  const sendToApp = (type, payload = null) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
      }
    } catch (e) {
      console.error("Bridge Error:", e);
    }
  };

  useEffect(() => {
    let interval;
    if (mode === 'FUN' && !result && !isAnimating) {
      let direction = true;
      interval = setInterval(() => {
        setRatio((prev) => {
          let next = prev;
          if (direction) {
            next += 2;
            if (next >= 100) direction = false;
          } else {
            next -= 2;
            if (next <= 0) direction = true;
          }
          return Math.max(0, Math.min(100, next));
        });
      }, 20);
    }
    return () => clearInterval(interval);
  }, [mode, result, isAnimating]);

  const handleDecision = () => {
    let currentWorry = worry.trim();
    if (!currentWorry) {
      currentWorry = '말 못 할 고민';
      setWorry(currentWorry); 
    }

    setIsAnimating(true);
    sendToApp('HAPTIC', 'Medium'); 

    setTimeout(() => {
      const randomVal = Math.random() * 100;
      const isDo = randomVal <= ratio;
      
      setResult(isDo ? 'DO' : 'DONT');
      setIsAnimating(false);
      
      sendToApp('HAPTIC', isDo ? 'Success' : 'Error');
    }, 2500);
  };

  const handleReset = () => {
    sendToApp('SHOW_AD', 'INTERSTITIAL');
    setResult(null);
    setWorry('');
    setRatio(50);
  };

  // handleShare 함수 제거됨

  const getSliderColor = () => {
    if (ratio === 50) return '#333';
    return ratio > 50 ? '#2ecc71' : '#e74c3c';
  };

  return (
    <div className="page-container decision-container">
      {/* 1. 애니메이션 중 */}
      {isAnimating && (
        <div className="animating-view">
          <div className="lottie-wrapper" style={{width: 200, height: 200, margin: '0 auto'}}>
             <Lottie animationData={catAnimation} loop={true} /> 
          </div>
          <h2 style={{marginTop: 20}}>고민 해결 중...</h2>
        </div>
      )}

      {/* 2. 결과 화면 */}
      {!isAnimating && result && (
        <div className="result-view">
          <div className="capture-area"> 
            <div className="lottie-result" style={{width: 150, height: 150, margin: '0 auto'}}>
              <Lottie 
                animationData={result === 'DO' ? successAnimation : failAnimation} 
                loop={result === 'DO'} 
                autoPlay={true}
              />
            </div>
            
            <h3 className="worry-title">"{worry}"</h3>
            <h1 className={`result-text ${result === 'DO' ? 'do' : 'dont'}`}>
              {result === 'DO' ? 'DO IT!' : "DON'T!"}
            </h1>
            <p className="ratio-text">
              확률: {result === 'DO' ? Math.round(ratio) : 100 - Math.round(ratio)}%
            </p>
            <p className="date-text">{new Date().toLocaleDateString()}</p>
          </div>

          <div className="action-buttons">
            {/* 공유하기 버튼 제거 -> 다시하기 버튼만 꽉 채움 */}
            <button className="btn btn-secondary" onClick={handleReset} style={{flex: 1, backgroundColor: '#555', color:'white'}}>
                🔄 다시하기
            </button>
          </div>
        </div>
      )}

      {/* 3. 입력 화면 */}
      {!isAnimating && !result && (
        <div className="input-view" style={{width: '100%', maxWidth: 320}}>
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${mode === 'BASIC' ? 'active' : ''}`}
              onClick={() => setMode('BASIC')}
            >
              🎚️ 기본
            </button>
            <button 
              className={`mode-btn ${mode === 'FUN' ? 'active' : ''}`}
              onClick={() => setMode('FUN')}
            >
              🎮 타이밍
            </button>
          </div>

          <div className="cat-header" style={{width: 150, height: 150, margin: '0 auto 20px'}}>
             <Lottie animationData={catAnimation} loop={true} />
          </div>

          <input 
            type="text" 
            className="worry-input"
            placeholder="어떤 고민이 있나요?"
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
            maxLength={50}
          />

          <div className="slider-card">
            <div className="slider-labels">
              <span style={{color: ratio > 50 ? '#2ecc71' : '#ccc'}}>
                할래 {Math.round(ratio)}%
              </span>
              <span style={{color: ratio < 50 ? '#e74c3c' : '#ccc'}}>
                말래 {100 - Math.round(ratio)}%
              </span>
            </div>

            <input 
              type="range" 
              min="0" 
              max="100" 
              value={ratio}
              onChange={(e) => {
                if(mode === 'BASIC') {
                    setRatio(Number(e.target.value));
                }
              }}
              disabled={mode === 'FUN'}
              className="custom-range"
              style={{accentColor: getSliderColor()}} 
            />
            
            <p className="helper-text" style={{color: getSliderColor()}}>
              {mode === 'FUN' ? "타이밍을 맞춰 누르세요!" : 
               ratio === 50 ? "반반 무 많이" : 
               ratio > 50 ? "하고 싶은 마음이 크네요" : "하기 싫은가봐요"}
            </p>
          </div>

          <button 
            className="btn btn-decision" 
            style={{backgroundColor: getSliderColor()}}
            onClick={handleDecision}
          >
            결정하기
          </button>
        </div>
      )}
    </div>
  );
}