import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { CATEGORY_COLORS } from '../services/api';

export default function GlobeView({ events, onEventClick, selectedEvent }) {
  const globeRef = useRef();

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.3;
      globeRef.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, []);

  useEffect(() => {
    if (selectedEvent && selectedEvent.location && typeof selectedEvent.location.lat === 'number' && globeRef.current) {
      // Temporarily pause autorotate to zoom in
      const controls = globeRef.current.controls();
      const prevRotate = controls.autoRotate;
      controls.autoRotate = false;
      
      globeRef.current.pointOfView({ 
        lat: selectedEvent.location.lat, 
        lng: selectedEvent.location.lng, 
        altitude: 0.8 
      }, 1000);

      // Optionally resume after animation...
      setTimeout(() => {
        if (controls) controls.autoRotate = prevRotate;
      }, 3000);
    }
  }, [selectedEvent]);

  const pointsData = useMemo(() => {
    return events
      .filter(e => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
      .map(e => ({
        lat: e.location.lat,
        lng: e.location.lng,
        size: Math.max(0.15, (e.intensity || 5) * 0.06),
        color: CATEGORY_COLORS[e.category] || '#3B82F6',
        label: e.title,
        event: e,
      }));
  }, [events]);

  const ringsData = useMemo(() => {
    return events
      .filter(e => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number' && (e.intensity || 0) >= 4)
      .map(e => ({
        lat: e.location.lat,
        lng: e.location.lng,
        maxR: 3,
        propagationSpeed: 2,
        repeatPeriod: 1200,
        color: () => CATEGORY_COLORS[e.category] || '#3B82F6',
      }));
  }, [events]);

  const handlePointClick = useCallback((point) => {
    if (point && point.event && onEventClick) {
      onEventClick(point.event);
    }
  }, [onEventClick]);

  return (
    <div data-testid="globe-container" className="absolute inset-0 z-0" style={{ background: '#0A0B0E' }}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl=""
        backgroundColor="#0A0B0E"
        atmosphereColor="#3B82F6"
        atmosphereAltitude={0.15}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude="size"
        pointRadius={0.4}
        pointsMerge={false}
        onPointClick={handlePointClick}
        pointLabel={(d) => `
          <div style="background:rgba(10,11,14,0.95);backdrop-filter:blur(12px);color:#fff;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);font-family:'IBM Plex Sans',sans-serif;width:max-content;max-width:380px;word-wrap:break-word;white-space:normal;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:${d.color};margin-bottom:4px;">${d.event.category}</div>
            <div style="font-size:12px;font-weight:500;line-height:1.4;">${d.label}</div>
            <div style="font-size:10px;color:#94A3B8;margin-top:6px;">${d.event.country}</div>
          </div>
        `}
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  );
}
