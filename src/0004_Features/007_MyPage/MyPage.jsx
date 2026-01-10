/**
 * [Revision Info]
 * Rev: 36.0
 * Date: 2026-01-09
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. 데이터 관리 탭 추가 및 CSV 업로드/다운로드 기능 구현
 * 2. Supabase 일괄 insert 로직 및 파일 파싱 핸들러 통합
 * 3. 탭 네비게이션 구조 확장 (내정보, 직원, 결제, 데이터)
 * [Logic Change Log]
 * - Before: 정보 수정과 직원 목록만 있는 기본 구조
 * - After:  CSV 파일을 통한 데이터 백업 및 대량 등록 기능 수용
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient.js';
import styles from './MyPage.module.css';

export default function MyPage({ session, initialTab = 'info' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [newName, setNewName] = useState('');
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
      setNewName(data.full_name || '');
    }
  };

  const fetchStaffList = async () => {
    if (!myProfile?.company_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', myProfile.company_id);
    if (data) setStaffList(data);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', session.user.id);
    if (error) alert('수정 실패: ' + error.message);
    else alert('정보가 수정되었습니다.');
    setLoading(false);
  };

  // CSV 다운로드 (데이터 백업)
  const handleDownloadCSV = async () => {
    const { data: pins, error } = await supabase.from('pins').select('*').eq('user_id', session.user.id);
    if (error || !pins || pins.length === 0) return alert("다운로드할 데이터가 없습니다.");

    const headers = ["건물유형", "건물명", "주소", "상세주소", "거래상태", "매매가", "전세금", "보증금", "월세", "키워드", "메모"];
    const rows = pins.map(p => [
      `"${p.property_type || ''}"`, `"${p.building_name || ''}"`, `"${p.address || ''}"`, 
      `"${p.detailed_address || ''}"`, `"${p.status || ''}"`, p.sale_price || 0, 
      p.jeonse_deposit || 0, p.rent_deposit || 0, p.rent_amount || 0, 
      `"${p.keywords || ''}"`, `"${p.notes || ''}"`
    ]);

    const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `매물데이터_백업_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // CSV 업로드 (데이터 일괄 등록)
  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      try {
        const csv = target.result;
        const lines = csv.split("\n").filter(line => line.trim() !== "");
        const dataToInsert = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.replace(/"/g, "").trim());
          return {
            user_id: session.user.id,
            property_type: values[0], building_name: values[1], address: values[2],
            detailed_address: values[3], status: values[4], sale_price: Number(values[5]) || 0,
            jeonse_deposit: Number(values[6]) || 0, rent_deposit: Number(values[7]) || 0,
            rent_amount: Number(values[8]) || 0, keywords: values[9], notes: values[10],
            is_sale: Number(values[5]) > 0, is_jeonse: Number(values[6]) > 0, is_rent: Number(values[8]) > 0,
            lat: 37.5665, lng: 126.9780 // 주소변환 로직 필요
          };
        });

        const { error } = await supabase.from('pins').insert(dataToInsert);
        if (error) throw error;
        alert(`${dataToInsert.length}건 업로드 완료!`);
      } catch (err) {
        alert("업로드 실패: " + err.message);
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file, "EUC-KR");
  };

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.tabNav}>
        {['info', 'staff', 'payment', 'data'].map((tab) => (
          <button 
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'info' ? '내 정보 수정' : tab === 'staff' ? '직원 관리' : tab === 'payment' ? '결제 관리' : '데이터 관리'}
          </button>
        ))}
      </nav>

      <div className={styles.contentArea}>
        {activeTab === 'info' && (
          <form className={styles.form} onSubmit={handleUpdateProfile}>
            <h2 className={styles.formTitle}>기본 정보</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>이메일</label>
              <input className={styles.input} type="text" value={session.user.email} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>이름</label>
              <input className={styles.input} type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <button className={styles.button} disabled={loading}>저장하기</button>
          </form>
        )}

        {activeTab === 'staff' && (
          <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>직원 목록</h2>
            <div className={styles.table}>
              {staffList.map(staff => (
                <div key={staff.id} className={styles.tableRow}>
                  <div className={styles.col1}>{staff.full_name || '이름 없음'}</div>
                  <div className={styles.col2}>{staff.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>데이터 관리</h2>
            <p className={styles.infoText}>CSV 파일을 통해 매물을 일괄 업로드하거나 백업할 수 있습니다.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className={styles.button} onClick={handleDownloadCSV}>📥 데이터 다운로드</button>
              <button className={styles.button} style={{backgroundColor:'#3b82f6'}} onClick={() => fileInputRef.current.click()}>📤 데이터 업로드</button>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".csv" onChange={handleUploadCSV} />
            </div>
          </div>
        )}

        {activeTab === 'payment' && <p className={styles.infoText}>준비 중인 기능입니다.</p>}
      </div>
    </div>
  );
}