'use client';

import React, { useState, useEffect, useCallback } from 'react';
import './gallery.css';

export interface GalleryItem {
  id: string;
  src: string;
  title: string;
  category: 'championship' | 'ceremonies' | 'campus' | 'track' | 'leadership';
  categoryLabel: string;
  categoryIcon: string;
  venue: string;
  year: string;
  description: string;
  featured?: boolean;
  gridSpan: 'span-7' | 'span-5' | 'span-4' | 'span-6' | 'span-12';
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-01',
    src: '/gallery/gallery-01-champions-men.jpg',
    title: "Men's Overall Athletic Champions",
    category: 'championship',
    categoryLabel: 'Championship Triumphs',
    categoryIcon: '🏆',
    venue: 'Main Stadium Grandstand',
    year: '2026',
    description: 'Men’s track and field squad celebrating their overall team championship title, rolling trophy, and victory banner.',
    featured: true,
    gridSpan: 'span-6',
  },
  {
    id: 'gal-02',
    src: '/gallery/gallery-02-champions-women.jpg',
    title: "Women's Overall Athletic Champions",
    category: 'championship',
    categoryLabel: 'Championship Triumphs',
    categoryIcon: '🏆',
    venue: 'Main Stadium Grandstand',
    year: '2026',
    description: 'Women’s track and field squad triumphant with gold medals and the prestigious state championship banner.',
    featured: true,
    gridSpan: 'span-6',
  },
  {
    id: 'gal-03',
    src: '/gallery/gallery-03-acsce-lobby-contingent.jpg',
    title: 'Host Institution Athletics Contingent',
    category: 'campus',
    categoryLabel: 'Campus & Glory',
    categoryIcon: '🏛️',
    venue: 'Campus Central Foyer',
    year: '2026',
    description: 'Student-athletes and physical education faculty assembled with university championship silverware and trophies.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-04',
    src: '/gallery/gallery-04-grand-prize-ceremony.jpg',
    title: 'Championship Podium & Trophy Ceremony',
    category: 'ceremonies',
    categoryLabel: 'Ceremonies & Podiums',
    categoryIcon: '📜',
    venue: 'Main Auditorium Stage',
    year: '2026',
    description: 'University dignitaries and collegiate leadership conferring gold medals, citations, and trophies to outstanding student-athletes.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-05',
    src: '/gallery/gallery-05-vtu-felicitation.jpg',
    title: 'State Qualifiers & Medalists Felicitation',
    category: 'ceremonies',
    categoryLabel: 'Ceremonies & Podiums',
    categoryIcon: '📜',
    venue: 'University Championship Stage',
    year: '2025',
    description: 'Track and field qualifiers honored by Visvesvaraya Technological University dignitaries and technical officials.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-06',
    src: '/gallery/gallery-06-trophy-presentation.jpg',
    title: 'Annual Athletic Silverware Celebration',
    category: 'campus',
    categoryLabel: 'Campus & Glory',
    categoryIcon: '🏛️',
    venue: 'Executive Honors Foyer',
    year: '2025',
    description: 'Student-athletes celebrating prestigious golden trophies earned across state track and field competitions.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-07',
    src: '/gallery/gallery-07-sports-contingent-field.jpg',
    title: 'Track & Field Delegation on Ground',
    category: 'track',
    categoryLabel: 'Track & Field',
    categoryIcon: '🏃',
    venue: 'Main Synthetic Athletic Arena',
    year: '2025',
    description: 'Collegiate delegation in official team colors assembled on the synthetic track arena with campus facade in background.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-08',
    src: '/gallery/gallery-08-ped-faculty-leadership.jpg',
    title: 'Physical Education Directorate & Jury',
    category: 'leadership',
    categoryLabel: 'Leadership & PEDs',
    categoryIcon: '🎖️',
    venue: 'Directorate Secretariat Desk',
    year: '2026',
    description: 'Physical Education Directors and technical jury presiding over championship trophies and delegation schedules.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-09',
    src: '/gallery/gallery-09-medal-conferment.jpg',
    title: 'Individual Gold Medal & Citation Honor',
    category: 'ceremonies',
    categoryLabel: 'Ceremonies & Podiums',
    categoryIcon: '📜',
    venue: 'Championship Presentation Podium',
    year: '2025',
    description: 'High-achieving student-athlete presented with official gold medal and merit certificate by university delegates.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-10',
    src: '/gallery/gallery-10-athletic-tournament-ground.jpg',
    title: 'Athletic March Past & Parade of Contingents',
    category: 'track',
    categoryLabel: 'Track & Field',
    categoryIcon: '🏃',
    venue: '8-Lane Synthetic Track Arena',
    year: '2025',
    description: 'Participating collegiate contingents marching on the synthetic track during the ceremonial opening parade.',
    gridSpan: 'span-4',
  },
  {
    id: 'gal-11',
    src: '/gallery/gallery-11-trophy-cabinet-honors.jpg',
    title: 'Championship Silverware & Hall of Fame',
    category: 'campus',
    categoryLabel: 'Campus & Glory',
    categoryIcon: '🏛️',
    venue: 'Sports Directorate Exhibition Hall',
    year: '2026',
    description: 'Permanent showcase displaying university championship trophies, rolling shields, and collegiate athletic records.',
    gridSpan: 'span-4',
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All Moments', icon: '🌟' },
  { key: 'championship', label: 'Championship Triumphs', icon: '🏆' },
  { key: 'ceremonies', label: 'Ceremonies & Podiums', icon: '📜' },
  { key: 'campus', label: 'Campus & Glory', icon: '🏛️' },
  { key: 'track', label: 'Track & Action', icon: '🏃' },
  { key: 'leadership', label: 'Leadership', icon: '🎖️' },
] as const;

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredItems = activeCategory === 'all'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter(item => item.category === activeCategory);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    document.body.style.overflow = 'auto';
  }, []);

  const showNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  const showPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, showNext, showPrev]);

  const currentItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <section className="gallery-section" id="gallery">
      <div className="section-wrapper">
        
        {/* Section Header */}
        <div className="gallery-header">
          <div className="gallery-badge">
            <span>📸 ACSATHLAURA &apos;26 &bull; OFFICIAL CHAMPIONSHIP CHRONICLES</span>
          </div>
          <h2 className="gallery-title">
            Championship Gallery &amp; Hall of Glory
          </h2>
          <p className="gallery-subtitle">
            Honoring the athletic grit, podium milestones, and celebratory silverware earned by collegiate contingents representing Dr. ACS College of Engineering and Visvesvaraya Technological University.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="gallery-filters" role="tablist" aria-label="Gallery categories">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all'
              ? GALLERY_ITEMS.length
              : GALLERY_ITEMS.filter(i => i.category === cat.key).length;

            return (
              <button
                key={cat.key}
                type="button"
                className={`gallery-filter-btn ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
                role="tab"
                aria-selected={activeCategory === cat.key}
              >
                <span>{cat.icon} {cat.label}</span>
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Balanced Pure Photo Editorial Showcase */}
        <div className="gallery-bento-grid">
          {filteredItems.map((item, index) => {
            const itemNumber = (index + 1).toString().padStart(2, '0');
            const totalNumber = filteredItems.length.toString().padStart(2, '0');

            return (
              <div
                key={item.id}
                className={`gallery-card ${item.gridSpan}`}
                onClick={() => openLightbox(index)}
                tabIndex={0}
                role="button"
                aria-label={`View photo ${itemNumber}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index);
                  }
                }}
              >
                {/* Pure Photo Stage */}
                <div className="gallery-card-img-wrapper">
                  <img
                    src={item.src}
                    alt={`Championship photo ${itemNumber}`}
                    className="gallery-card-img"
                    loading="lazy"
                  />
                  
                  {/* Floating Number Badge */}
                  <div className="gallery-card-top-badges">
                    <span className="gallery-top-badge">
                      {itemNumber} / {totalNumber}
                    </span>
                  </div>

                  {/* Hover Cue */}
                  <div className="gallery-card-hover-cue">
                    <span>🔍 View Full Photo</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Interactive Lightbox Modal */}
      {currentItem && lightboxIndex !== null && (
        <div 
          className="gallery-lightbox-backdrop" 
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image Lightbox"
        >
          {/* Header Controls */}
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-counter">
              PHOTO {lightboxIndex + 1} OF {filteredItems.length}
            </div>
            <button 
              type="button" 
              className="lightbox-close-btn" 
              onClick={closeLightbox}
              aria-label="Close Lightbox (Esc)"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Central Image Stage */}
          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="lightbox-nav-arrow prev" 
              onClick={showPrev}
              aria-label="Previous Photo (Left Arrow)"
              title="Previous"
            >
              &#8592;
            </button>

            <div className="lightbox-image-container">
              <img
                src={currentItem.src}
                alt={`Photo ${lightboxIndex + 1}`}
                className="lightbox-active-img"
              />
            </div>

            <button 
              type="button" 
              className="lightbox-nav-arrow next" 
              onClick={showNext}
              aria-label="Next Photo (Right Arrow)"
              title="Next"
            >
              &#8594;
            </button>
          </div>

          {/* Footer Thumbnail Strip */}
          <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-thumbnails">
              {filteredItems.map((thumb, idx) => (
                <img
                  key={thumb.id}
                  src={thumb.src}
                  alt={`Thumbnail ${idx + 1}`}
                  className={`lightbox-thumb ${idx === lightboxIndex ? 'active' : ''}`}
                  onClick={() => setLightboxIndex(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
