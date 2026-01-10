/**
 * [Revision: 56.0]
 * - RoadviewPanel을 mapSection 내부로 배치하여 z-index 및 레이아웃 연결 보장
 */
import React from 'react';
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
  const { isLeftPanelOpen, isRoadviewMode, roadviewPosition } = useMap(); //

  return (
    <div className={styles.pageContainerMap}>
      <div className={`${styles.sidebar} ${isLeftPanelOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <LeftPanel />
      </div>

      <div className={styles.mapSection} style={{ position: 'relative' }}>
        <div className={overlayStyles.topFilterBar}>
          <MapFilters />
        </div>
        <KakaoMap />
        <MapControls />
        <MapContextMenu />

        {/* ★ 로드뷰 활성화 시 지도 우측에 표시 */}
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