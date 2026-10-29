'use client';

import React, { useState } from 'react';

interface RouteInfo {
  id: string;
  category: 'railway' | 'bus' | 'shuttle';
  badge: string;
  badgeColor: string;
  title: string;
  origin: string;
  transitType: string;
  duration: string;
  frequency: string;
  steps: string[];
  keyHighlight: string;
}

const TRANSIT_ROUTES: RouteInfo[] = [
  {
    id: 'route-yeshwanthpur',
    category: 'railway',
    badge: 'ROUTE 01 • METRO & SHUTTLE',
    badgeColor: '#2563eb',
    title: 'From Yeshwanthpura Railway Station (YPR)',
    origin: 'Yeshwanthpura Junction',
    transitType: 'Namma Metro (Green ➔ Purple) + College Shuttle',
    duration: '~45–55 mins',
    frequency: 'Metro every 5 mins • Shuttle every 15 mins',
    steps: [
      'Exit Yeshwanthpur Railway Station and walk to Yeshwanthpur Metro Station (Green Line).',
      'Board the Green Line train towards Silk Institute.',
      'Interchange at Nadaprabhu Kempegowda Station (Majestic) to the Purple Line towards Challaghatta.',
      'Alight at Challaghatta Metro Station (terminal station, just 2.0 km from campus).',
      'Board the continuous Dr. ACSCE / Rajarajeswari Medical College & Hospital (RRMC&H) pickup shuttle directly to the Athletics Stadium.'
    ],
    keyHighlight: 'Fastest transit avoiding all highway peak traffic via the Purple Metro corridor.'
  },
  {
    id: 'route-majestic',
    category: 'bus',
    badge: 'ROUTE 02 • DIRECT BMTC & METRO',
    badgeColor: '#d97706',
    title: 'From Majestic (KSR Railway & Kempegowda Bus Stand)',
    origin: 'KSR Bengaluru City / Majestic Terminal',
    transitType: 'BMTC 226 Series Bus OR Direct Purple Line Metro',
    duration: '~40–50 mins',
    frequency: 'BMTC buses every 10 mins • Metro every 5 mins',
    steps: [
      'Option A (BMTC Bus): Walk to Kempegowda Bus Station (Majestic). Board BMTC bus towards Bidadi in the 226 series (226, 226M, 226N). Confirm stop with conductor.',
      'Alight at the bus stop directly opposite Rajarajeswari Medical College & Hospital (RR Medical College).',
      'Option B (Direct Metro): Walk to Majestic Metro Station and board the Purple Line directly towards Challaghatta.',
      'At Challaghatta / RR Medical College stop, transfer to the designated Dr. ACSCE campus contingent bus.'
    ],
    keyHighlight: 'Direct BMTC 226 series operates frequently along Mysore Road Expressway.'
  },
  {
    id: 'route-kengeri',
    category: 'railway',
    badge: 'ROUTE 03 • COLLEGE BUS CORRIDOR',
    badgeColor: '#059669',
    title: 'From Kengeri Railway Station',
    origin: 'Kengeri Railway Station Forecourt',
    transitType: 'Dedicated Dr. ACSCE College Bus Shuttle',
    duration: '~10–15 mins',
    frequency: 'Continuous match-day contingent loops',
    steps: [
      'Alight at Kengeri Railway Station (closest broad-gauge rail junction).',
      'Assemble at the designated Dr. ACSCE tournament pickup point in front of station forecourt.',
      'Board the official college bus proceeding toward Kambipura via the Bengaluru-Mysuru Expressway corridor.',
      'Direct transit with priority drop-off at the Dr. ACS College of Engineering Stadium Gate.'
    ],
    keyHighlight: 'Ideal for contingents arriving via Mysuru, Hassan, or South-Western trains.'
  },
  {
    id: 'route-rrmch',
    category: 'shuttle',
    badge: 'ROUTE 04 • CAMPUS SHUTTLE LINK',
    badgeColor: '#7c3aed',
    title: 'From Rajarajeswari Medical College (RRMC&H Main Gate)',
    origin: 'RRMC&H Main Entrance, Mysore Road',
    transitType: 'High-Frequency Campus Shuttle Van',
    duration: '~3–5 mins',
    frequency: 'Continuous every 10 mins',
    steps: [
      'Convenient hub for all highway buses and contingent drop-offs on Mysore Road.',
      'Designated pickup point directly in front of the Main Gate of Rajarajeswari Medical College & Hospital.',
      'Continuous dedicated tournament shuttle vans transfer athletes and managers directly to the ACSCE Athletic Arena.'
    ],
    keyHighlight: '24/7 on-demand connector between sister medical institution and stadium.'
  },
  {
    id: 'route-checkpost',
    category: 'shuttle',
    badge: 'ROUTE 05 • LOCAL TRANSIT STOP',
    badgeColor: '#ea580c',
    title: 'From Check Post Bus Stop',
    origin: 'Check Post Stop, Kambipura',
    transitType: 'Designated College Bus Pickup',
    duration: '~5 mins',
    frequency: 'Scheduled intervals matching train arrivals',
    steps: [
      'Alight at the Check Post Bus Stop along Mysore Road.',
      'Wait at the marked Dr. ACS College of Engineering championship pickup shelter.',
      'Board the college bus for immediate transfer inside the 35+ acre campus stadium complex.'
    ],
    keyHighlight: 'Quick access point for local Bengaluru commuter buses.'
  }
];

export default function TransitRoutes() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'railway' | 'bus' | 'shuttle'>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-yeshwanthpur');

  const filteredRoutes = activeFilter === 'all' 
    ? TRANSIT_ROUTES 
    : TRANSIT_ROUTES.filter((r) => r.category === activeFilter);

  const selectedRoute = TRANSIT_ROUTES.find((r) => r.id === selectedRouteId) || TRANSIT_ROUTES[0];

  return (
    <div className="transit-routes-container" id="contingent-transport-guidelines">
      {/* Header Bar */}
      <div className="transit-routes-header">
        <div>
          <span className="transit-routes-pill">🚍 OFFICIAL CONTINGENT LOGISTICS &bull; ROUTE GUIDELINES</span>
          <h3 className="transit-routes-title">
            Student-Athlete &amp; Contingent Transportation Routes
          </h3>
          <p className="transit-routes-desc">
            Direct transit pathways from Bengaluru railway hubs, metro terminals, and bus stations to 
            <strong> Dr. A.C.S. College of Engineering</strong>, Kambipura, Mysore Road.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="transit-filter-pills">
          <button
            type="button"
            className={`transit-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All 5 Routes
          </button>
          <button
            type="button"
            className={`transit-filter-btn ${activeFilter === 'railway' ? 'active' : ''}`}
            onClick={() => setActiveFilter('railway')}
          >
            🚆 Railway Hubs
          </button>
          <button
            type="button"
            className={`transit-filter-btn ${activeFilter === 'bus' ? 'active' : ''}`}
            onClick={() => setActiveFilter('bus')}
          >
            🚌 Majestic &amp; BMTC
          </button>
          <button
            type="button"
            className={`transit-filter-btn ${activeFilter === 'shuttle' ? 'active' : ''}`}
            onClick={() => setActiveFilter('shuttle')}
          >
            🚐 Campus Shuttles
          </button>
        </div>
      </div>

      {/* Main Grid: Left Route Cards / Right Active Route Detailed Steps */}
      <div className="transit-routes-grid">
        {/* Left Column: Route Cards */}
        <div className="transit-routes-list">
          {filteredRoutes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <div
                key={route.id}
                className={`transit-route-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRouteId(route.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedRouteId(route.id); }}
              >
                <div className="transit-card-top">
                  <span 
                    className="transit-card-badge"
                    style={{ background: `${route.badgeColor}15`, color: route.badgeColor, borderColor: `${route.badgeColor}40` }}
                  >
                    {route.badge}
                  </span>
                  <span className="transit-card-time">{route.duration}</span>
                </div>
                <h4 className="transit-card-name">{route.title}</h4>
                <div className="transit-card-meta">
                  <span><strong>Mode:</strong> {route.transitType}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Turn-by-Turn Guidance */}
        <div className="transit-route-detail-box">
          <div className="transit-detail-header">
            <span 
              className="transit-detail-badge"
              style={{ background: `${selectedRoute.badgeColor}20`, color: selectedRoute.badgeColor }}
            >
              {selectedRoute.badge}
            </span>
            <h4 className="transit-detail-title">{selectedRoute.title}</h4>
            <div className="transit-detail-meta-row">
              <span className="transit-detail-chip">📍 <strong>Origin:</strong> {selectedRoute.origin}</span>
              <span className="transit-detail-chip">⏱️ <strong>Est. Time:</strong> {selectedRoute.duration}</span>
              <span className="transit-detail-chip">🔄 <strong>Frequency:</strong> {selectedRoute.frequency}</span>
            </div>
          </div>

          <div className="transit-steps-wrapper">
            <h5 className="transit-steps-heading">Step-by-Step Travel Instructions:</h5>
            <ol className="transit-steps-list">
              {selectedRoute.steps.map((step, idx) => (
                <li key={idx} className="transit-step-item">
                  <span className="transit-step-num">{idx + 1}</span>
                  <span className="transit-step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="transit-detail-highlight">
            <span className="highlight-icon">💡</span>
            <div>
              <strong>Key Advantage:</strong> {selectedRoute.keyHighlight}
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Callout for PEDs & Student-Athletes */}
      <div className="transit-advisory-banner">
        <div className="transit-advisory-badge">
          <span>⚠️</span>
          <span>IMPORTANT ADVISORY FOR CONTINGENT DIRECTORS &amp; ATHLETES</span>
        </div>
        <div className="transit-advisory-grid">
          <div className="advisory-point">
            <span className="advisory-dot">&bull;</span>
            <div>
              <strong>30-Minute Advance Arrival:</strong> Physical Education Directors (PEDs) and student-athletes are requested to arrive at their designated pickup points <strong>30 minutes before schedule</strong> and notify the tournament transportation committee members.
            </div>
          </div>
          <div className="advisory-point">
            <span className="advisory-dot">&bull;</span>
            <div>
              <strong>Confirm Bus Timing:</strong> Please confirm college bus timings and pickup arrangements with the official College Transport Coordinator prior to departing from rail stations.
            </div>
          </div>
          <div className="advisory-point">
            <span className="advisory-dot">&bull;</span>
            <div>
              <strong>Pre-Journey Verification:</strong> BMTC bus routes (226 series), Namma Metro Purple Line service intervals, and last-mile connections should be verified before travelling.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
