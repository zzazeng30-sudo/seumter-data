import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient.js';
import styles from './MyPage.module.css';

export default function MyPage({ session, initialTab = 'info' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  
  // [수정] 내 정보 관리용 전체 상태
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    job_title: '',
    address: ''
  });

  const [staffList, setStaffList] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMyProfile();
    if (activeTab === 'staff') fetchStaffList();
  }, [activeTab]);

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setMyProfile(data);
      // DB 데이터를 입력 폼에 채워넣기
      setProfileForm({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        job_title: data.job_title || '',
        address: data.address || ''
      });
    }
  };

  const fetchStaffList = async () => {
    if (!myProfile?.company_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', myProfile.company_id);
    if (data) setStaffList(data);
  };

  // 입력값 변경 핸들러
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  // 프로필 업데이트 핸들러
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number,
      job_title: profileForm.job_title,
      address: profileForm.address
    }).eq('id', session.user.id);

    if (error) alert('수정 실패: ' + error.message);
    else alert('정보가 수정되었습니다.');
    
    setLoading(false);
  };

  // [추가] 로그아웃 핸들러
  const handleLogout = async () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      await supabase.auth.signOut();
      window.location.reload(); // 새로고침하여 로그인 화면으로 이동
    }
  };

  // CSV 다운로드 (기존 유지)
  const handleDownloadCSV = async () => {
    const { data: pins, error } = await supabase.from('pins').select('*').eq('user_id', session.user.id);
    if (error || !pins || pins.length === 0) return alert("다운로드할 데이터가 없습니다.");
    // ... (기존 CSV 로직 생략 없이 사용 가능) ...
    // 편의상 짧게 줄였으나, 기존 코드를 그대로 쓰셔도 됩니다.
    alert('데이터 다운로드 기능은 기존 코드를 유지하세요.'); 
  };
  
  // CSV 업로드 (기존 유지)
  const handleUploadCSV = async (e) => { /* 기존 코드 유지 */ };

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.tabNav}>
        {['info', 'staff', 'payment', 'data'].map((tab) => (
          <button 
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'info' ? '내 정보' : tab === 'staff' ? '직원 관리' : tab === 'payment' ? '결제 관리' : '데이터 관리'}
          </button>
        ))}
      </nav>

      <div className={styles.contentArea}>
        {activeTab === 'info' && (
          <div className={styles.formContainer}>
            <form className={styles.form} onSubmit={handleUpdateProfile}>
              <h2 className={styles.formTitle}>내 정보 수정</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>이메일 (ID)</label>
                <input className={styles.input} type="text" value={session.user.email} disabled style={{ backgroundColor: '#f3f4f6' }} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>이름</label>
                <input 
                  className={styles.input} 
                  name="full_name" 
                  value={profileForm.full_name} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>연락처</label>
                <input 
                  className={styles.input} 
                  name="phone_number" 
                  placeholder="010-0000-0000"
                  value={profileForm.phone_number} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>직책</label>
                <input 
                  className={styles.input} 
                  name="job_title" 
                  placeholder="예: 대표, 실장"
                  value={profileForm.job_title} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>주소</label>
                <input 
                  className={styles.input} 
                  name="address" 
                  value={profileForm.address} 
                  onChange={handleProfileChange} 
                />
              </div>

              <button className={styles.button} disabled={loading}>
                {loading ? '저장 중...' : '정보 수정 저장'}
              </button>
            </form>

            <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #eee' }} />

            {/* [추가] 로그아웃 버튼 */}
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={handleLogout}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#ef4444', // 빨간색
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

        {/* 나머지 탭 (기존 코드와 동일) */}
        {activeTab === 'staff' && (
          <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>직원 목록</h2>
            <div className={styles.table}>
              {staffList.length > 0 ? staffList.map(staff => (
                <div key={staff.id} className={styles.tableRow}>
                  <div className={styles.col1}>{staff.full_name}</div>
                  <div className={styles.col2}>{staff.email}</div>
                </div>
              )) : <p style={{padding:'20px', color:'#999'}}>등록된 직원이 없습니다.</p>}
            </div>
          </div>
        )}
        
        {activeTab === 'data' && (
            <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>데이터 관리</h2>
            <p className={styles.infoText}>CSV 백업 및 복원</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className={styles.button} onClick={handleDownloadCSV}>📥 다운로드</button>
              <button className={styles.button} style={{backgroundColor:'#3b82f6'}} onClick={() => fileInputRef.current.click()}>📤 업로드</button>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".csv" onChange={handleUploadCSV} />
            </div>
          </div>
        )}

        {activeTab === 'payment' && <p className={styles.infoText}>결제 기능 준비 중...</p>}
      </div>
    </div>
  );
}