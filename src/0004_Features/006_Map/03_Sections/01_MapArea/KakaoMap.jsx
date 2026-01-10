/**
 * [Revision: 52.0]
 * - RoadviewClient를 활용한 로드뷰 좌표 검색 로직 강화
 * - 클릭 이벤트 발생 시 isRoadviewMode 상태를 실시간 참조하도록 수정
 */
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapUI.module.css';

const KAKAO_APP_KEY = "c493060c5720050dfb0b923762ae3423";
const WALKER_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%232563eb' stroke='white' stroke-width='4'/%3E%3Cpath d='M50 15 L80 75 L50 60 L20 75 Z' fill='white'/%3E%3C/svg%3E`;
const RED_PIN_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' fill='%23ef4444' stroke='white' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='9' r='2.5' fill='white'/%3E%3C/svg%3E`;

export default function KakaoMap() {
  const { 
    mapRef, mapInstanceRef, setIsMapReady, updateMapState, 
    resetSelection, onMapRightClick, 
    isRoadviewMode, setRoadviewPosition, roadviewPosition, roadviewHeading,
    rightClickPin 
  } = useMap();

  const rvClientRef = useRef(null);
  const walkerRef = useRef(null); 
  const rightClickMarkerRef = useRef(null); 

  // ★ 클로저 문제 해결을 위해 최신 상태를 담는 Ref 생성
  const handlersRef = useRef({ isRoadviewMode, setRoadviewPosition, resetSelection });

  useEffect(() => {
    handlersRef.current = { isRoadviewMode, setRoadviewPosition, resetSelection };
  }, [isRoadviewMode, setRoadviewPosition, resetSelection]);

  useEffect(() => {
    const scriptId = 'kakao-map-script';
    const onLoad = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(36.7989, 127.0749),
          level: 4,
        });
        mapInstanceRef.current = map;
        
        // ★ 로드뷰 클라이언트 생성
        rvClientRef.current = new window.kakao.maps.RoadviewClient();
        
        const handleClick = (mouseEvent) => {
          const { isRoadviewMode, setRoadviewPosition, resetSelection } = handlersRef.current;
          
          if (isRoadviewMode) {
            const position = mouseEvent.latLng;
            // 50m 이내 가장 가까운 로드뷰 파노라마 ID 조회
            rvClientRef.current.getNearestPanoId(position, 50, (panoId) => {
              if (panoId) {
                setRoadviewPosition({ 
                  lat: position.getLat(), 
                  lng: position.getLng(), 
                  panoId 
                });
              } else {
                console.warn("이 지점은 로드뷰를 지원하지 않습니다.");
              }
            });
          } else {
            resetSelection();
          }
        };

        const handleRightClick = (mouseEvent) => {
          const { isRoadviewMode } = handlersRef.current;
          if (!isRoadviewMode) {
            onMapRightClick({ latLng: mouseEvent.latLng, point: mouseEvent.point });
          }
        };

        window.kakao.maps.event.addListener(map, 'click', handleClick);
        window.kakao.maps.event.addListener(map, 'rightclick', handleRightClick);
        window.kakao.maps.event.addListener(map, 'zoom_changed', () => updateMapState());
        window.kakao.maps.event.addListener(map, 'idle', () => updateMapState());

        setIsMapReady(true);
        updateMapState(); 
      });
    };

    if (window.kakao && window.kakao.maps) { onLoad(); }
    else {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = onLoad;
        document.head.appendChild(script);
      }
    }
  }, []);

  // 로드뷰 타일 표시 토글
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    if (isRoadviewMode) {
      map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      map.setCursor('crosshair');
    } else {
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      map.setCursor('move');
      if (walkerRef.current) {
        walkerRef.current.setMap(null);
        walkerRef.current = null;
      }
    }
  }, [isRoadviewMode]);

  // 로드뷰 위치 표시용 워커(파란 원) 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !isRoadviewMode || !roadviewPosition) return;

    const position = new window.kakao.maps.LatLng(roadviewPosition.lat, roadviewPosition.lng);
    if (!walkerRef.current) {
      const content = document.createElement('div');
      content.style.cssText = `width:40px;height:40px;background-image:url("${WALKER_SVG}");background-size:contain;position:absolute;transform-origin:50% 50%;`;
      walkerRef.current = new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 0.5, zIndex: 9999 });
      walkerRef.current.setMap(map);
    }
    walkerRef.current.setPosition(position);
    const el = walkerRef.current.getContent();
    if (el) el.style.transform = `rotate(${roadviewHeading}deg)`;
  }, [isRoadviewMode, roadviewPosition, roadviewHeading]);

  // 우클릭 빨간 핀
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    if (rightClickMarkerRef.current) rightClickMarkerRef.current.setMap(null);

    if (rightClickPin) {
      const position = new window.kakao.maps.LatLng(rightClickPin.lat, rightClickPin.lng);
      const content = document.createElement('div');
      content.style.cssText = `width:32px;height:32px;background-image:url("${RED_PIN_SVG}");background-size:contain;`;
      rightClickMarkerRef.current = new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 1, zIndex: 9998 });
      rightClickMarkerRef.current.setMap(map);
    }
  }, [rightClickPin]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}