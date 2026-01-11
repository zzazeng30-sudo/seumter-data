import { useRef, useEffect } from 'react';

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

    // 1. 화면에서 사라진 마커 제거
    const currentIds = new Set(displayNodes.map(n => String(n.id)));
    markersMapRef.current.forEach((overlay, id) => {
      if (!currentIds.has(String(id))) {
        overlay.setMap(null);
        markersMapRef.current.delete(id);
      }
    });

    // 2. 호버 정보창(InfoBox) 오버레이 생성
    if (!hoverOverlayRef.current) {
      const container = document.createElement('div');
      container.style.cssText = 'position: relative; background: transparent; border: none; margin: 0; padding: 0;';
      
      hoverOverlayRef.current = new window.kakao.maps.CustomOverlay({
        clickable: false, 
        content: container,
        xAnchor: 0.5, 
        yAnchor: 2.0, 
        zIndex: 9999 
      });
    }

    if (!hoveredPinId) hideInfoBox();

    // 3. 마커 렌더링
    displayNodes.forEach(node => {
      if (!node.lat || !node.lng) return;

      const position = new window.kakao.maps.LatLng(node.lat, node.lng);
      let overlay = markersMapRef.current.get(node.id);

      const isClusterNode = node.type === 'CLUSTER';
      const anchorY = isClusterNode ? 0.5 : 1; 

      if (!overlay) {
        const content = document.createElement('div');
        
        content.style.width = isClusterNode ? '42px' : '32px';
        content.style.height = '42px';
        content.style.position = 'relative'; 

        overlay = new window.kakao.maps.CustomOverlay({ 
          position, 
          content, 
          yAnchor: anchorY, 
          zIndex: 100, 
          clickable: true 
        });
        overlay.setMap(map);
        markersMapRef.current.set(node.id, overlay);
      }

      const content = overlay.getContent();
      content.ontouchstart = (e) => { e.stopPropagation(); };

      const items = node.items || (node.data ? [node.data] : []);
      const itemIds = items.map(i => String(i.id));
      
      const isHovered = Array.isArray(hoveredPinId) 
        ? (itemIds.length === hoveredPinId.length && itemIds.every(id => hoveredPinId.map(String).includes(id)))
        : (String(hoveredPinId) === String(node.data?.id || node.items?.[0]?.id));

      // ----------------------------------------------------------------
      // CLUSTER (원형)
      // ----------------------------------------------------------------
      if (isClusterNode) {
        const stateKey = `cluster-${items.length}-${isHovered}`;
        if (content.dataset.state !== stateKey) {
          content.style.cssText = `width:42px; height:42px; cursor:pointer; display:flex; align-items:center; justify-content:center; transform-origin: center; transition: transform 0.2s ease; position: relative;`;
          content.style.transform = isHovered ? 'scale(1.15)' : 'scale(1)';
          
          content.innerHTML = `
            <div style="width:100%; height:100%; border-radius:50%; background:#3b82f6;
              border:${isHovered ? '2.5px dashed #ff0000' : '2px solid white'};
              color:white; font-weight:800; font-size:14px; display:flex; justify-content:center; align-items:center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              ${items.length}
            </div>
          `;
          content.dataset.state = stateKey;
        }
        overlay.setZIndex(isHovered ? 150 : 100);
        
        content.onmouseenter = () => {
          setHoveredPinId(itemIds);
          if (items.length > 0) showInfoBox(items[0], position, '#3b82f6');
        };
        content.onmouseleave = () => {
          setHoveredPinId(null);
          hideInfoBox();
        };
        content.onclick = (e) => { 
          e.stopPropagation(); 
          map.setBounds(new window.kakao.maps.LatLngBounds().extend(position), 80); 
        };
      } 
      // ----------------------------------------------------------------
      // SINGLE / STACK (핀 모양)
      // ----------------------------------------------------------------
      else {
        const mainPin = node.type === 'SINGLE' ? node.data : node.items[0];
        const isSelected = selectedPin?.id === mainPin.id || activeOverlayKey === node.id;
        const statusColor = getStatusColor(mainPin.status);
        const isStack = node.type === 'STACK';
        const zIdx = isSelected ? 200 : (isHovered ? 150 : 100);

        const stateKey = `${isSelected}-${isHovered}-${statusColor}-${isStack}`;
        if (content.dataset.state !== stateKey) {
          content.style.cssText = `width: 32px; height: 42px; cursor: pointer; display: flex; flex-direction: column; align-items: center; transform-origin: bottom center; transition: transform 0.1s ease; position: relative;`;
          content.style.transform = isHovered ? 'scale(1.2)' : 'scale(1)';
          
          content.innerHTML = `
            <svg width="32" height="42" viewBox="0 0 24 32" style="overflow: visible;">
              <path d="M12 32C12 32 24 18.5 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.5 12 32 12 32Z" 
                  fill="${isSelected ? '#000' : (isStack ? '#10b981' : statusColor)}"
                  stroke="${isHovered ? '#ff0000' : 'none'}" stroke-width="2.5"/>
              <circle cx="12" cy="12" r="7" fill="white"/>
              ${isStack ? `<text x="12" y="16" text-anchor="middle" fill="#10b981" font-size="10" font-weight="900">${items.length}</text>` : ''}
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
          e.stopPropagation(); 
          const isMobile = window.innerWidth <= 768;
          if (isMobile) {
            const isCurrentlyHovered = Array.isArray(hoveredPinId) 
              ? hoveredPinId.map(String).includes(String(mainPin.id))
              : String(hoveredPinId) === String(mainPin.id);

            if (!isCurrentlyHovered) {
              setHoveredPinId(mainPin.id);
              showInfoBox(mainPin, position, isStack ? '#10b981' : statusColor);
              return; 
            }
          }
          setSelectedPin(mainPin); 
          setActiveOverlayKey(node.id); 
          map.panTo(position); 
        };
        content.oncontextmenu = (e) => { 
          e.preventDefault(); e.stopPropagation(); 
          handlePinContextMenu(e, mainPin, isStack, node.id); 
        };
      }
    });
  }, [displayNodes, isMapReady, selectedPin, hoveredPinId, activeOverlayKey]);

  // ★ [수정됨] 거래 유형별 가격 표시 로직 (월세/보증금 구분)
  const showInfoBox = (pin, position, color) => {
    if (!hoverOverlayRef.current || !mapInstanceRef.current) return;
    
    // 포맷터
    const fmt = (n) => {
      const num = Number(n || 0);
      if (num === 0) return '';
      return num >= 10000 
        ? (num % 10000 === 0 ? `${num/10000}억` : `${(num/10000).toFixed(1)}억`) 
        : num.toLocaleString();
    };

    const parts = [];

    // 거래 유형별 표시 분기
    if (pin.is_sale) {
      // 매매: 매매가 + (보증금) + (권리금)
      if (pin.sale_price) parts.push(`매${fmt(pin.sale_price)}`);
      // 매매/전세일 때 폼의 '보증금'은 DB의 rent_amount 필드에 저장됨
      if (pin.rent_amount) parts.push(`보${fmt(pin.rent_amount)}`);
    } 
    else if (pin.is_jeonse) {
      // 전세: 전세금 + (보증금) + (권리금)
      if (pin.jeonse_deposit) parts.push(`전${fmt(pin.jeonse_deposit)}`);
      if (pin.rent_amount) parts.push(`보${fmt(pin.rent_amount)}`);
    } 
    else if (pin.is_rent) {
      // 월세: 보증금 + 월세 + (권리금)
      // 월세일 때 보증금은 rent_deposit 필드, 월세는 rent_amount 필드
      if (pin.rent_deposit) parts.push(`보${fmt(pin.rent_deposit)}`);
      if (pin.rent_amount) parts.push(`월${fmt(pin.rent_amount)}`);
    }
    
    // 권리금은 공통적으로 있으면 표시
    if (pin.key_money) parts.push(`권${fmt(pin.key_money)}`);

    // 콤마(,)와 띄어쓰기로 연결
    const priceDisplay = parts.length > 0 ? parts.join(', ') : '가격미정';
    
    const keyword = (pin.keywords || '매물').split(',')[0].substring(0, 10);

    const infoBoxHTML = `
      <div style="
        background: white; 
        border: 2px solid ${color}; 
        border-radius: 6px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
        min-width: 140px; 
        overflow: hidden;
        animation: fadeIn 0.1s ease-out;
      ">
        <div style="
          background: ${color}; 
          color: white; 
          padding: 6px 10px; 
          font-size: 12px; 
          font-weight: bold; 
          text-align: center;
        ">
          ${keyword}
        </div>
        <div style="
          padding: 8px 10px; 
          font-size: 13px; 
          font-weight: 800; 
          color: #1f2937; 
          text-align: center;
          white-space: nowrap;
        ">
          ${priceDisplay}
        </div>
      </div>
    `;

    hoverOverlayRef.current.setPosition(position);
    hoverOverlayRef.current.getContent().innerHTML = infoBoxHTML;
    hoverOverlayRef.current.setMap(mapInstanceRef.current);
  };

  const hideInfoBox = () => { 
    if (hoverOverlayRef.current) hoverOverlayRef.current.setMap(null);
  };

  return { overlayDOMsRef: markersMapRef };
}