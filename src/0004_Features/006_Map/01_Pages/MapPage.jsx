/**
 * [Revision Info]
 * Rev: 61.0 (Mobile UX Fix)
 * - 모바일에서 매물 클릭 시 하단 시트가 자동으로 올라와 지도를 가리는 현상 제거
 * - 매물 선택 시에도 시트는 '최소화(접힘)' 상태 유지
 */
import React, { useState, useEffect } from 'react';
import { MapProvider, useMap } from '../02_Contexts/MapContext';
import KakaoMap from '../03_Sections/01_MapArea/KakaoMap';
import LeftPanel from '../03_Sections/03_Sidebar/LeftPanel';
import PinSidebar from '../03_Sections/03_Sidebar/index';
import MapFilters from '../03_Sections/02_Overlays/MapFilters';
import MapControls from '../03_Sections/02_Overlays/MapControls';
import MapContextMenu from '../03_Sections/02_Overlays/MapContextMenu';
import RoadviewPanel from '../03_Sections/03_Sidebar/RoadviewPanel';

import styles from './MapLayout.module.css';
import overlayStyles from './MapOverlays.module.css';

function MapPageContent() {
  const { 
    isLeftPanelOpen, 
    isRoadviewMode, 
    roadviewPosition,
    selectedPin 
  } = useMap(); 

  const [isMinimized, setIsMinimized] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [기능] 모바일 하단 시트 제어 (자동 펼침 방지)
  useEffect(() => {
    if (isMobile) {
      // ★ [수정] 매물이 선택되든 해제되든, 시트는 항상 '접힌 상태(Minimized)'로 시작합니다.
      // 사용자가 필요하면 화살표를 눌러서 직접 올려보게 합니다.
      setIsMinimized(true);
    }
  }, [selectedPin, isMobile]);

  return (
    <div className={styles.pageContainerMap}>
      <div className={`
        ${styles.sidebar} 
        ${isLeftPanelOpen ? styles.sidebarOpen : styles.sidebarClosed}
        ${isMobile ? (isMinimized ? styles.sidebarMinimized : styles.sidebarExpanded) : ''}
      `}>
        {isMobile && (
          <div 
            className={styles.handleBar} 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "열기" : "접기"}
          >
            <div className={`${styles.arrowIcon} ${isMinimized ? styles.arrowUp : ''}`} />
          </div>
        )}
        <LeftPanel />
      </div>

      <div className={styles.mapSection} style={{ position: 'relative' }}>
        <div className={overlayStyles.topFilterBar}>
          <MapFilters />
        </div>
        
        {/* 메인 지도 영역 */}
        <KakaoMap />
        
        <MapControls />
        <MapContextMenu />

        {isRoadviewMode && roadviewPosition && (
          <RoadviewPanel />
        )}
      </div>

      <PinSidebar />
    </div>
  );
}

export default function MapPage({ session }) {
  return (
    <MapProvider session={session}>
      <MapPageContent />
    </MapProvider>
  );
}