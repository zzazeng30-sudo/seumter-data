/**
 * [Revision Info]
 * Rev: 86.0 (Restore InfoBox & Cluster Hover)
 * Date: 2026-01-09
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. 클러스터(지역 묶음) 호버 시 사각형 메모창(InfoBox)이 뜨지 않던 문제 해결.
 * 2. 클러스터 및 일반 마커 모두 호버 시 정보창 호출 로직 복구.
 * 3. 양방향 호버 동기화 및 점선 테두리 시각 효과 유지.
 * [Logic Change Log]
 * - Before: CLUSTER 타입 노드에서 showInfoBox 호출이 누락되어 메모창이 보이지 않음.
 * - After:  모든 마커 타입에서 호버 시 정보창을 띄우고, 대표 매물 정보를 출력하도록 수정.
 */
import { useRef, useEffect } from 'react';
import overlayStyles from '../01_Pages/MapOverlays.module.css';

export default function useMapMarkers({ 
  mapInstanceRef, isMapReady, displayNodes, 
  setSelectedPin, setActiveOverlayKey, handlePinContextMenu, 
  selectedPin, hoveredPinId, setHoveredPinId, activeOverlayKey
}) {
  const markersMapRef = useRef(new Map()); 
  const hoverOverlayRef = useRef(null);   

  const getStatusColor = (status) => {
    if (status === '거래중') return '#2563eb'; 
    if (status === '거래완료') return '#ef4444'; 
    return '#9ca3af'; 
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;
    const map = mapInstanceRef.current;

    const currentIds = new Set(displayNodes.map(n => String(n.id)));
    markersMapRef.current.forEach((overlay, id) => {
      if (!currentIds.has(String(id))) {
        overlay.setMap(null);
        markersMapRef.current.delete(id);
      }
    });

    if (!hoverOverlayRef.current) {
      const container = document.createElement('div');
      container.style.display = 'none'; 
      hoverOverlayRef.current = new window.kakao.maps.CustomOverlay({
        clickable: false, xAnchor: -0.2, yAnchor: 1.0, zIndex: 1000   
      });
      hoverOverlayRef.current.setContent(container);
      hoverOverlayRef.current.setMap(map);
    }

    displayNodes.forEach(node => {
      const position = new window.kakao.maps.LatLng(node.lat, node.lng);
      let overlay = markersMapRef.current.get(node.id);

      if (!overlay) {
        const content = document.createElement('div');
        overlay = new window.kakao.maps.CustomOverlay({ 
          position, content, yAnchor: 1, zIndex: 100, clickable: true 
        });
        overlay.setMap(map);
        markersMapRef.current.set(node.id, overlay);
      }

      const content = overlay.getContent();
      const items = node.items || (node.data ? [node.data] : []);
      const itemIds = items.map(i => String(i.id));
      
      const isHovered = Array.isArray(hoveredPinId) 
        ? (itemIds.length === hoveredPinId.length && itemIds.every(id => hoveredPinId.map(String).includes(id)))
        : (hoveredPinId && itemIds.includes(String(hoveredPinId)));

      if (node.type === 'CLUSTER') {
        const stateKey = `cluster-${items.length}-${isHovered}`;
        if (content.dataset.state !== stateKey) {
          content.style.cssText = `width:42px; height:42px; cursor:pointer; transition: all 0.2s ease; display:flex; align-items:center; justify-content:center;`;
          content.style.transform = isHovered ? 'scale(1.15)' : 'scale(1)';
          content.innerHTML = `
            <div style="width: 100%; height: 100%; border-radius: 50%; background: #3b82f6;
              border: ${isHovered ? '2.5px dashed #ff0000' : '2px solid white'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;
              color: white; font-weight: 800; font-size: 14px;">
              ${items.length}
            </div>
          `;
          content.dataset.state = stateKey;
        }
        overlay.setZIndex(isHovered ? 150 : 100);
        
        content.onmouseenter = () => {
          setHoveredPinId(itemIds);
          // ★ 클러스터 호버 시에도 첫 번째 아이템 정보를 정보창에 표시
          if (items.length > 0) showInfoBox(items[0], position, '#3b82f6');
        };
        content.onmouseleave = () => {
          setHoveredPinId(null);
          hideInfoBox();
        };
        content.onclick = (e) => { e.stopPropagation(); map.setBounds(new window.kakao.maps.LatLngBounds().extend(position), 80); };
      } else {
        const mainPin = node.type === 'SINGLE' ? node.data : node.items[0];
        const isSelected = selectedPin?.id === mainPin.id || activeOverlayKey === node.id;
        const statusColor = getStatusColor(mainPin.status);
        const isStack = node.type === 'STACK';
        const zIdx = isSelected ? 200 : (isHovered ? 150 : 100);

        const stateKey = `${isSelected}-${isHovered}-${statusColor}-${isStack}`;
        if (content.dataset.state !== stateKey) {
          content.style.cssText = `width: 32px; height: 42px; cursor: pointer; position: relative; display: flex; flex-direction: column; align-items: center; transition: transform 0.1s ease;`;
          content.style.transform = isHovered ? 'scale(1.2)' : 'scale(1)';
          
          content.innerHTML = `
            <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
              <path d="M12 32C12 32 24 18.5 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.5 12 32 12 32Z" 
                  fill="${isSelected ? '#000' : (isStack ? '#10b981' : statusColor)}"
                  stroke="${isHovered ? '#ff0000' : 'none'}" 
                  stroke-width="2.5" stroke-dasharray="4 2"/>
              <circle cx="12" cy="12" r="7" fill="white"/>
              <text x="12" y="15" text-anchor="middle" fill="${isStack ? '#10b981' : '#333'}" font-size="${isStack ? '9' : '0'}" font-weight="900">
                ${isStack ? items.length : ''}
              </text>
            </svg>
          `;
          content.dataset.state = stateKey;
        }
        overlay.setZIndex(zIdx);

        content.onmouseenter = () => {
          setHoveredPinId(itemIds); 
          showInfoBox(mainPin, position, isStack ? '#10b981' : statusColor);
        };
        content.onmouseleave = () => {
          setHoveredPinId(null);
          hideInfoBox();
        };
        content.onclick = (e) => { 
          e.stopPropagation(); setSelectedPin(mainPin); setActiveOverlayKey(node.id); map.panTo(position); 
        };
        content.oncontextmenu = (e) => { 
          e.preventDefault(); e.stopPropagation(); handlePinContextMenu(e, mainPin, isStack, node.id); 
        };
      }
    });
  }, [displayNodes, isMapReady, selectedPin, hoveredPinId, activeOverlayKey]);

  const showInfoBox = (pin, position, color) => {
    if (!hoverOverlayRef.current) return;
    const fmt = (n) => {
      const num = Number(n || 0);
      return num >= 10000 ? (num/10000).toFixed(1)+'억' : num.toLocaleString();
    };
    let typeStr = pin.is_sale ? '매매' : (pin.is_jeonse ? '전세' : '월세');
    let priceDetail = pin.is_sale ? fmt(pin.sale_price) : pin.is_jeonse ? fmt(pin.jeonse_deposit) : `월${fmt(pin.rent_amount)}|보${fmt(pin.rent_deposit)}`;
    const keyword = (pin.keywords || '매물').split(',')[0].substring(0, 10);

    const infoBoxHTML = `
      <div style="background:white; border:2px solid ${color}; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.25); min-width:140px; display:flex; flex-direction:column; pointer-events:none;">
        <div style="background:${color}; color:white; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:2px 2px 0 0; text-align:center;">${keyword}</div>
        <div style="padding:8px 10px; font-size:11px; font-weight:800; color:#111; text-align:center;">${typeStr} | ${priceDetail}</div>
      </div>
    `;
    const box = hoverOverlayRef.current.getContent();
    box.innerHTML = infoBoxHTML;
    box.style.display = 'block';
    hoverOverlayRef.current.setPosition(position);
  };

  const hideInfoBox = () => { if (hoverOverlayRef.current) hoverOverlayRef.current.getContent().style.display = 'none'; };

  return { overlayDOMsRef: markersMapRef };
}