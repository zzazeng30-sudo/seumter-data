import React, { useState, useEffect } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';

// 페이지 컴포넌트들
import MapPage from '../../0004_Features/006_Map/01_Pages/MapPage';
import CustomerPage from '../../0004_Features/004_Customer/CustomerPage';
import ContractPage from '../../0004_Features/003_Contract/ContractPage';
import DashboardPage from '../../0004_Features/005_Dashboard/DashboardPage';
import MyPage from '../../0004_Features/007_MyPage/MyPage';
import ConsultationLogPage from '../../0004_Features/002_Consultation/ConsultationLogPage';
import PropertyPage from '../../0004_Features/008_Property/PropertyPage';

const menuData = {
  '대시보드': [
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage /> },
    { id: 'dashboard-list', name: '매물 등록', component: <PropertyPage />, isMap: true },
  ],
  '매물': [
    { id: 'prop-map', name: '매물 지도', component: <MapPage />, isMap: true, mode: 'manage' },
    { id: 'prop-list', name: '매물 리스트', component: <PropertyPage />, isMap: true },
  ],
  '고객': [
    { id: 'cust-add', name: '고객 추가' }, 
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true },
    { id: 'cust-log', name: '상담 관리', component: <ConsultationLogPage />, isMap: true },
  ],
  '계약': [
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true },
  ],
  '마이페이지': [
    { id: 'my-info', name: '내정보 수정', component: <MyPage />, isMyPage: true },
  ]
};

const mainMenus = ['대시보드', '매물', '고객', '계약', '마이페이지'];

export default function MainLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[1]);
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[1]][0].id);
  const [customerModalTrigger, setCustomerModalTrigger] = useState(0);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const currentSubList = menuData[activeMainMenu] || [];
  const currentPage = (activeSubMenu === 'cust-add' || activeSubMenu === 'cust-manage')
    ? currentSubList.find(m => m.id === 'cust-manage') 
    : (currentSubList.find(m => m.id === activeSubMenu) || currentSubList[0]);

  const isMapMode = currentPage?.isMap;

  // 스타일 객체
  const s = {
    layout: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: '#fff' },
    // 메인 메뉴: 가로 스크롤
    mainBar: { 
      display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap', borderBottom: '1px solid #eee', 
      flexShrink: 0, padding: '0 10px', scrollbarWidth: 'none', msOverflowStyle: 'none' 
    },
    // 서브 메뉴: 가로 스크롤
    subBar: { 
      display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap', borderBottom: '1px solid #f5f5f5', 
      flexShrink: 0, padding: '0 10px', backgroundColor: '#fafafa' 
    },
    tab: { 
      padding: isMobile ? '12px 15px' : '15px 20px', fontSize: isMobile ? '14px' : '15px', 
      border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 
    },
    subTab: { 
      padding: '10px 12px', fontSize: '13px', border: 'none', background: 'none', 
      cursor: 'pointer', flexShrink: 0 
    },
    // 컨텐츠 영역: 지도일 때 꽉 차게
    content: { flex: 1, overflow: isMapMode ? 'hidden' : 'auto', position: 'relative' }
  };

  return (
    <div style={s.layout}>
      <header style={s.mainBar} className="no-scrollbar">
        {mainMenus.map(m => (
          <button 
            key={m} 
            style={{ ...s.tab, fontWeight: activeMainMenu === m ? 'bold' : 'normal', color: activeMainMenu === m ? '#2563eb' : '#555' }}
            onClick={() => { setActiveMainMenu(m); setActiveSubMenu(menuData[m][0].id); }}
          >
            {m}
          </button>
        ))}
      </header>

      <nav style={s.subBar} className="no-scrollbar">
        {currentSubList.map(sub => {
          let isTabActive = activeSubMenu === sub.id;
          if (sub.id === 'cust-add') isTabActive = isCustomerModalVisible;
          if (sub.id === 'cust-manage') isTabActive = (activeSubMenu === 'cust-manage' && !isCustomerModalVisible);

          return (
            <button 
              key={sub.id} 
              style={{ ...s.subTab, color: isTabActive ? '#2563eb' : '#777', fontWeight: isTabActive ? 'bold' : 'normal' }}
              onClick={() => {
                if(sub.id === 'cust-add') {
                  setActiveSubMenu('cust-manage');
                  setCustomerModalTrigger(prev => prev + 1);
                  setIsCustomerModalVisible(true);
                } else {
                  setActiveSubMenu(sub.id);
                  setIsCustomerModalVisible(false);
                }
              }}
            >
              {sub.name}
            </button>
          );
        })}
      </nav>

      <main style={s.content}>
        {currentPage?.component && React.cloneElement(currentPage.component, { 
          session,
          modalTrigger: customerModalTrigger,
          onModalClose: () => { setIsCustomerModalVisible(false); setCustomerModalTrigger(0); }
        })}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        /* 지도가 모바일에서 데스크탑처럼 보이는 현상을 수정하기 위한 CSS */
        @media (max-width: 768px) {
          /* 왼쪽 패널 너비 조정 (MapPage 내부 클래스가 있다면 해당 클래스명으로 조절 필요) */
          [class*="sidePanel"], [class*="listPanel"] {
            width: 100% !important;
            height: 40% !important;
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            z-index: 10 !important;
            border-radius: 20px 20px 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
}