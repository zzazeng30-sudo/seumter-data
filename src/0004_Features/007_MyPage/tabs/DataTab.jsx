import React, { useRef } from 'react';
import styles from '../MyPage.module.css'; // 기존 스타일 재사용
import { useCsvManager } from '../hooks/useCsvManager';

export default function DataTab({ session }) {
  const fileInputRef = useRef(null);
  const { loading, handleDownloadCSV, handleUploadCSV } = useCsvManager(session);

  return (
    <div className={styles.staffContainer}>
      <h2 className={styles.staffTitle}>데이터 관리</h2>
      <p className={styles.infoText}>CSV 백업 및 복원</p>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          className={styles.button} 
          onClick={handleDownloadCSV} 
          disabled={loading}
        >
          {loading ? '처리 중...' : '📥 다운로드'}
        </button>
        
        <button 
          className={styles.button} 
          style={{ backgroundColor: loading ? '#9ca3af' : '#3b82f6' }} 
          onClick={() => fileInputRef.current.click()} 
          disabled={loading}
        >
          {loading ? '업로드 중...' : '📤 업로드'}
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".csv" 
          onChange={handleUploadCSV} 
        />
      </div>

      {loading && (
        <p style={{ marginTop: '10px', color: '#2563eb', fontSize: '14px' }}>
          데이터 처리 및 좌표 변환 중입니다. 잠시만 기다려주세요...
        </p>
      )}
    </div>
  );
}