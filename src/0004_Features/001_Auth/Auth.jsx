/**
 * [Revision Info]
 * Rev: 1.3
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Logic Change Log]
 * - Before: import { authService } from '../../../services/authService'; (경로 오류)
 * - After: import { authService } from '../../services/authService'; (경로 수정)
 */
import React, { useState } from 'react';
// [수정됨] 상위 폴더(001_Auth) -> 상위(0004_Features) -> src 로 가야 하므로 ../../ 입니다.
import { authService } from '../../services/authService';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;

    if (isSignUp) {
      // 1. 회원가입 시도
      result = await authService.signUp({ email, password });
      if (!result.error) {
        alert('회원가입 성공! (이메일 확인이 필요할 수 있습니다)\n자동으로 로그인됩니다.');
      }
    } else {
      // 2. 로그인 시도
      result = await authService.signIn({ email, password });
    }

    if (result.error) {
      alert((isSignUp ? '회원가입' : '로그인') + ' 실패: ' + result.error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px', textAlign: 'center' }}>
          {isSignUp ? '회원가입' : '로그인'}
        </h2>
        
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', width: '250px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', width: '250px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        
        <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? '처리 중...' : (isSignUp ? '회원가입 하기' : '로그인')}
        </button>

        <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '10px' }}>
          <span style={{ color: '#666' }}>
            {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
          </span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
          >
            {isSignUp ? '로그인으로 전환' : '회원가입으로 전환'}
          </button>
        </div>
      </form>
    </div>
  );
}