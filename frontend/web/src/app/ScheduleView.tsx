'use client';

import React, { useState, useMemo } from 'react';
import { OFFICIAL_CHAMPIONSHIP_RULES } from '@/lib/championship-events';

export interface ScheduleEvent {
  code: number;
  time: string;
  callRoom: string;
  name: string;
  specification?: string;
  round: 'Heats' | 'Semi-Final' | 'Final' | 'Trial & Final' | 'Decathlon' | 'Heptathlon' | 'Ceremony';
  section: 'Men' | 'Women' | 'Mixed' | 'Both';
  venue: string;
  category: 'Track' | 'Hurdles' | 'Field' | 'Relay' | 'Combined' | 'WalkMarathon' | 'Ceremony';
}

interface DaySchedule {
  title: string;
  date: string;
  morningMedal: string;
  eveningMedal: string;
  events: ScheduleEvent[];
}

const OFFICIAL_SCHEDULE_DATA: Record<number, DaySchedule> = {
  1: {
    title: 'Day 1 — Inaugural Track & Field Finals',
    date: 'Tuesday, Dec 8, 2026',
    morningMedal: '11:00 AM – 12:00 Noon',
    eveningMedal: '04:30 PM – 05:30 PM',
    events: [
      { code: 7, time: '06:30 AM', callRoom: '06:00 AM', name: '10,000 mtr Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 7, time: '07:25 AM', callRoom: '06:55 AM', name: '10,000 mtr Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 16, time: '07:30 AM', callRoom: '07:00 AM', name: 'High Jump', round: 'Trial & Final', section: 'Women', venue: 'High Jump D-Fan', category: 'Field' },
      { code: 13, time: '07:45 AM', callRoom: '07:15 AM', name: 'Javelin Throw', specification: '600 gm', round: 'Trial & Final', section: 'Women', venue: 'Javelin Runway & Sector', category: 'Field' },
      { code: 0, time: '09:00 AM – 10:15 AM', callRoom: '08:30 AM', name: 'Opening Ceremony & Marchpast', specification: 'All contingents compulsory participation', round: 'Ceremony', section: 'Both', venue: 'Main Stadium Arena', category: 'Ceremony' },
      { code: 4, time: '10:30 AM', callRoom: '10:00 AM', name: '800 mtrs Run', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 4, time: '10:50 AM', callRoom: '10:20 AM', name: '800 mtrs Run', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 20, time: '11:15 AM', callRoom: '10:45 AM', name: '4 x 100 mtr Relay', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 20, time: '11:45 AM', callRoom: '11:15 AM', name: '4 x 100 mtr Relay', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 10, time: '12:30 PM', callRoom: '12:00 PM', name: '400 mtr Hurdles', specification: '0.914 mtr', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 10, time: '12:45 PM', callRoom: '12:15 PM', name: '400 mtr Hurdles', specification: '0.762 mtr', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 13, time: '02:30 PM', callRoom: '02:00 PM', name: 'Javelin Throw', specification: '800 gm', round: 'Trial & Final', section: 'Men', venue: 'Javelin Runway & Sector', category: 'Field' },
      { code: 16, time: '02:30 PM', callRoom: '02:00 PM', name: 'High Jump', round: 'Trial & Final', section: 'Men', venue: 'High Jump D-Fan', category: 'Field' },
      { code: 10, time: '02:45 PM', callRoom: '02:15 PM', name: '400 mtr Hurdles', specification: '0.762 mtr', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 10, time: '02:55 PM', callRoom: '02:25 PM', name: '400 mtr Hurdles', specification: '0.914 mtr', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 20, time: '03:10 PM', callRoom: '02:40 PM', name: '4 x 100 mtr Relay', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 20, time: '03:25 PM', callRoom: '02:55 PM', name: '4 x 100 mtr Relay', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 4, time: '03:50 PM', callRoom: '03:20 PM', name: '800 mtr Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 4, time: '04:05 PM', callRoom: '03:35 PM', name: '800 mtr Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 20, time: '04:20 PM', callRoom: '03:50 PM', name: '4 x 100 mtr Relay', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 20, time: '04:40 PM', callRoom: '04:10 PM', name: '4 x 100 mtr Relay', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
    ],
  },
  2: {
    title: 'Day 2 — 100m Sprint Crown & Combined Multi-Events Day 1',
    date: 'Wednesday, Dec 9, 2026',
    morningMedal: '11:00 AM – 12:00 Noon',
    eveningMedal: '04:30 PM – 05:30 PM',
    events: [
      { code: 19, time: '06:00 AM', callRoom: '05:30 AM', name: '20,000 mtr Walk Race', round: 'Final', section: 'Men', venue: 'Synthetic Track / Road Circuit', category: 'WalkMarathon' },
      { code: 19, time: '06:15 AM', callRoom: '05:45 AM', name: '20,000 mtr Walk Race', round: 'Final', section: 'Women', venue: 'Synthetic Track / Road Circuit', category: 'WalkMarathon' },
      { code: 3, time: '08:00 AM', callRoom: '07:30 AM', name: '400 mtr Run', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 12, time: '08:00 AM', callRoom: '07:30 AM', name: 'Discus Throw', specification: '2.0 KG', round: 'Trial & Final', section: 'Men', venue: 'Discus Cage', category: 'Field' },
      { code: 3, time: '08:30 AM', callRoom: '08:00 AM', name: '400 mtrs Run', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 24, time: '08:50 AM', callRoom: '08:20 AM', name: 'Decathlon — 100 mtr', specification: 'Decathlon Discipline 1', round: 'Decathlon', section: 'Men', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 17, time: '08:50 AM', callRoom: '08:20 AM', name: 'Triple Jump', round: 'Trial & Final', section: 'Women', venue: 'Jumping Pit 2 (South)', category: 'Field' },
      { code: 1, time: '09:00 AM', callRoom: '08:30 AM', name: '100 mtr Run', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 1, time: '09:30 AM', callRoom: '09:00 AM', name: '100 mtr Run', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 24, time: '09:45 AM', callRoom: '09:15 AM', name: 'Decathlon — Long Jump', specification: 'Decathlon Discipline 2', round: 'Decathlon', section: 'Men', venue: 'Jumping Pit 1 (North)', category: 'Combined' },
      { code: 25, time: '10:00 AM', callRoom: '09:30 AM', name: 'Heptathlon — 100 mtr Hurdles', specification: '0.838 mtr • Heptathlon Discipline 1', round: 'Heptathlon', section: 'Women', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 9, time: '10:10 AM', callRoom: '09:40 AM', name: '100 mtr Hurdles', specification: '0.838 mtr', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 24, time: '11:00 AM', callRoom: '10:30 AM', name: 'Decathlon — Shot Put', specification: '7.260 KG • Decathlon Discipline 3', round: 'Decathlon', section: 'Men', venue: 'Throwing Ring A', category: 'Combined' },
      { code: 25, time: '11:00 AM', callRoom: '10:30 AM', name: 'Heptathlon — High Jump', specification: 'Heptathlon Discipline 2', round: 'Heptathlon', section: 'Women', venue: 'High Jump Pit', category: 'Combined' },
      { code: 1, time: '11:15 AM', callRoom: '10:45 AM', name: '100 mtr Run', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 1, time: '11:30 AM', callRoom: '11:00 AM', name: '100 mtr Run', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 9, time: '12:15 PM', callRoom: '11:45 AM', name: '100 mtr Hurdles', specification: '0.838 mtr', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 22, time: '12:30 PM', callRoom: '12:00 PM', name: '4 x 400 mtr Mixed Relay', specification: 'Leg 1: W • Leg 2: M • Leg 3: W • Leg 4: M', round: 'Heats', section: 'Mixed', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 17, time: '02:30 PM', callRoom: '02:00 PM', name: 'Triple Jump', round: 'Trial & Final', section: 'Men', venue: 'Jumping Pit 2 (South)', category: 'Field' },
      { code: 12, time: '02:30 PM', callRoom: '02:00 PM', name: 'Discus Throw', specification: '1.0 KG', round: 'Trial & Final', section: 'Women', venue: 'Discus Cage', category: 'Field' },
      { code: 9, time: '02:30 PM', callRoom: '02:00 PM', name: '100 mtr Hurdles', specification: '0.838 mtr', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 24, time: '02:30 PM', callRoom: '02:00 PM', name: 'Decathlon — High Jump', specification: 'Decathlon Discipline 4', round: 'Decathlon', section: 'Men', venue: 'High Jump Pit', category: 'Combined' },
      { code: 22, time: '02:45 PM', callRoom: '02:15 PM', name: '4 x 400 mtr Mixed Relay', round: 'Semi-Final', section: 'Mixed', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 25, time: '03:15 PM', callRoom: '02:45 PM', name: 'Heptathlon — Shot Put', specification: '4.0 KG • Heptathlon Discipline 3', round: 'Heptathlon', section: 'Women', venue: 'Throwing Ring B', category: 'Combined' },
      { code: 1, time: '03:50 PM', callRoom: '03:20 PM', name: '100 mtrs Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 1, time: '04:00 PM', callRoom: '03:30 PM', name: '100 mtrs Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 6, time: '04:10 PM', callRoom: '03:40 PM', name: '5000 mtrs Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 6, time: '04:40 PM', callRoom: '04:10 PM', name: '5000 mtrs Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 25, time: '05:00 PM', callRoom: '04:30 PM', name: 'Heptathlon — 200 mtrs', specification: 'Heptathlon Discipline 4', round: 'Heptathlon', section: 'Women', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 24, time: '05:20 PM', callRoom: '04:50 PM', name: 'Decathlon — 400 mtr', specification: 'Decathlon Discipline 5', round: 'Decathlon', section: 'Men', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 22, time: '05:35 PM', callRoom: '05:05 PM', name: '4 x 400 mtr Mixed Relay', specification: 'Championship Decider', round: 'Final', section: 'Mixed', venue: 'Main Synthetic Track', category: 'Relay' },
    ],
  },
  3: {
    title: 'Day 3 — Half Marathon & Combined Multi-Events Climax',
    date: 'Thursday, Dec 10, 2026',
    morningMedal: '11:00 AM – 12:00 Noon',
    eveningMedal: '04:30 PM – 05:30 PM',
    events: [
      { code: 23, time: '06:15 AM', callRoom: '05:45 AM', name: '21km Half Marathon', round: 'Final', section: 'Men', venue: 'Campus Road Circuit', category: 'WalkMarathon' },
      { code: 23, time: '06:25 AM', callRoom: '05:55 AM', name: '21km Half Marathon', round: 'Final', section: 'Women', venue: 'Campus Road Circuit', category: 'WalkMarathon' },
      { code: 24, time: '08:30 AM', callRoom: '08:00 AM', name: 'Decathlon — 110 mtr Hurdles', specification: 'Decathlon Discipline 6', round: 'Decathlon', section: 'Men', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 8, time: '08:45 AM', callRoom: '08:15 AM', name: '110 mtr Hurdles', specification: '0.914 mtr', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 25, time: '09:00 AM', callRoom: '08:30 AM', name: 'Heptathlon — Long Jump', specification: 'Heptathlon Discipline 5', round: 'Heptathlon', section: 'Women', venue: 'Jumping Pit 1 (North)', category: 'Combined' },
      { code: 11, time: '09:00 AM', callRoom: '08:30 AM', name: 'Shot Put', specification: '4.00 kg', round: 'Final', section: 'Women', venue: 'Throwing Ring A', category: 'Field' },
      { code: 5, time: '09:05 AM', callRoom: '08:35 AM', name: '1500 mtr Run', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 5, time: '09:20 AM', callRoom: '08:50 AM', name: '1500 mtr Run', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 8, time: '09:45 AM', callRoom: '09:15 AM', name: '110 mtr Hurdles', specification: '0.914 mtr', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 15, time: '10:00 AM', callRoom: '09:30 AM', name: 'Long Jump', round: 'Final', section: 'Women', venue: 'Jumping Pit 2 (South)', category: 'Field' },
      { code: 3, time: '10:10 AM', callRoom: '09:40 AM', name: '400 mtr Run', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 24, time: '10:15 AM', callRoom: '09:45 AM', name: 'Decathlon — Discus Throw', specification: '2.0 KG • Decathlon Discipline 7', round: 'Decathlon', section: 'Men', venue: 'Discus Cage', category: 'Combined' },
      { code: 3, time: '10:15 AM', callRoom: '09:45 AM', name: '400 mtr Run', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 25, time: '10:45 AM', callRoom: '10:15 AM', name: 'Heptathlon — Javelin Throw', specification: '600 gm • Heptathlon Discipline 6', round: 'Heptathlon', section: 'Women', venue: 'Javelin Runway & Sector', category: 'Combined' },
      { code: 24, time: '11:15 AM', callRoom: '10:45 AM', name: 'Decathlon — Pole Vault', specification: 'Decathlon Discipline 8', round: 'Decathlon', section: 'Men', venue: 'Pole Vault Runway', category: 'Combined' },
      { code: 8, time: '02:30 PM', callRoom: '02:00 PM', name: '110 mtr Hurdles', specification: '0.914 mtr', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Hurdles' },
      { code: 15, time: '02:45 PM', callRoom: '02:15 PM', name: 'Long Jump', round: 'Final', section: 'Men', venue: 'Jumping Pit 1 (North)', category: 'Field' },
      { code: 24, time: '03:00 PM', callRoom: '02:30 PM', name: 'Decathlon — Javelin Throw', specification: '800 gm • Decathlon Discipline 9', round: 'Decathlon', section: 'Men', venue: 'Javelin Runway & Sector', category: 'Combined' },
      { code: 11, time: '03:30 PM', callRoom: '03:00 PM', name: 'Shot Put', specification: '7.260 kg', round: 'Final', section: 'Men', venue: 'Throwing Ring A', category: 'Field' },
      { code: 25, time: '04:00 PM', callRoom: '03:30 PM', name: 'Heptathlon — 800 mtr', specification: 'Final Heptathlon Discipline 7', round: 'Heptathlon', section: 'Women', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 24, time: '04:30 PM', callRoom: '04:00 PM', name: 'Decathlon — 1500 mtr', specification: 'Final Decathlon Discipline 10', round: 'Decathlon', section: 'Men', venue: 'Main Synthetic Track', category: 'Combined' },
      { code: 3, time: '04:40 PM', callRoom: '04:10 PM', name: '400 mtr Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 3, time: '04:45 PM', callRoom: '04:15 PM', name: '400 mtr Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
    ],
  },
  4: {
    title: 'Day 4 — 4x400m Baton Finals, 200m Climax & Valedictory',
    date: 'Friday, Dec 11, 2026',
    morningMedal: '11:00 AM – 12:00 Noon',
    eveningMedal: '04:00 PM – 05:30 PM',
    events: [
      { code: 14, time: '07:00 AM', callRoom: '06:30 AM', name: 'Hammer Throw', specification: '7.260 kg', round: 'Final', section: 'Men', venue: 'Hammer & Discus Cage', category: 'Field' },
      { code: 18, time: '07:15 AM', callRoom: '06:45 AM', name: 'Pole Vault', round: 'Final', section: 'Men', venue: 'Pole Vault Runway', category: 'Field' },
      { code: 2, time: '07:30 AM', callRoom: '07:00 AM', name: '200 mtr Run', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 2, time: '08:00 AM', callRoom: '07:30 AM', name: '200 mtr Run', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 5, time: '08:20 AM', callRoom: '07:50 AM', name: '1500 mtr Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 5, time: '08:30 AM', callRoom: '08:00 AM', name: '1500 mtr Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 18, time: '08:45 AM', callRoom: '08:15 AM', name: 'Pole Vault', round: 'Final', section: 'Women', venue: 'Pole Vault Runway', category: 'Field' },
      { code: 14, time: '09:00 AM', callRoom: '08:30 AM', name: 'Hammer Throw', specification: '4.00 kg', round: 'Final', section: 'Women', venue: 'Hammer & Discus Cage', category: 'Field' },
      { code: 21, time: '09:15 AM', callRoom: '08:45 AM', name: '4 x 400 mtr Relay', round: 'Heats', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 21, time: '09:45 AM', callRoom: '09:15 AM', name: '4 x 400 mtr Relay', round: 'Heats', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 2, time: '10:30 AM', callRoom: '10:00 AM', name: '200 mtrs Run', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 2, time: '10:45 AM', callRoom: '10:15 AM', name: '200 mtrs Run', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 21, time: '11:00 AM', callRoom: '10:30 AM', name: '4 x 400 mtr Relay', round: 'Semi-Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 21, time: '11:15 AM', callRoom: '10:45 AM', name: '4 x 400 mtr Relay', round: 'Semi-Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 0, time: '12:00 PM – 01:00 PM', callRoom: '11:30 AM', name: 'Championship Valedictory Program', specification: 'Dignitaries Address & Athletic Honours', round: 'Ceremony', section: 'Both', venue: 'Main Grandstand Arena', category: 'Ceremony' },
      { code: 2, time: '02:30 PM', callRoom: '02:00 PM', name: '200 mtrs Run', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 2, time: '02:45 PM', callRoom: '02:15 PM', name: '200 mtrs Run', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Track' },
      { code: 21, time: '03:00 PM', callRoom: '02:30 PM', name: '4 x 400 mtr Relay', round: 'Final', section: 'Men', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 21, time: '03:15 PM', callRoom: '02:45 PM', name: '4 x 400 mtr Relay', round: 'Final', section: 'Women', venue: 'Main Synthetic Track', category: 'Relay' },
      { code: 0, time: '04:00 PM', callRoom: '03:30 PM', name: 'Grand Medal Ceremony & Rolling Trophy Presentation', specification: 'Overall & Divisional Trophies', round: 'Ceremony', section: 'Both', venue: 'Main Stadium Podium', category: 'Ceremony' },
    ],
  },
};

export default function ScheduleView() {
  const [activeDay, setActiveDay] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSection, setFilterSection] = useState<'All' | 'Men' | 'Women' | 'Mixed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRules, setShowRules] = useState(false);

  const currentDayData = OFFICIAL_SCHEDULE_DATA[activeDay];

  const filteredEvents = useMemo(() => {
    return currentDayData.events.filter((ev) => {
      // Category filter
      if (filterCategory !== 'All') {
        if (filterCategory === 'Track' && ev.category !== 'Track') return false;
        if (filterCategory === 'Hurdles' && ev.category !== 'Hurdles') return false;
        if (filterCategory === 'Field' && ev.category !== 'Field') return false;
        if (filterCategory === 'Relay' && ev.category !== 'Relay') return false;
        if (filterCategory === 'Combined' && ev.category !== 'Combined') return false;
        if (filterCategory === 'WalkMarathon' && ev.category !== 'WalkMarathon') return false;
      }

      // Section filter
      if (filterSection !== 'All') {
        if (filterSection === 'Men' && ev.section !== 'Men' && ev.section !== 'Both') return false;
        if (filterSection === 'Women' && ev.section !== 'Women' && ev.section !== 'Both') return false;
        if (filterSection === 'Mixed' && ev.section !== 'Mixed') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ev.name.toLowerCase().includes(query);
        const matchesSpec = ev.specification?.toLowerCase().includes(query);
        const matchesCode = ev.code ? `code ${ev.code}`.includes(query) || `${ev.code}` === query : false;
        const matchesRound = ev.round.toLowerCase().includes(query);
        const matchesVenue = ev.venue.toLowerCase().includes(query);
        if (!matchesName && !matchesSpec && !matchesCode && !matchesRound && !matchesVenue) return false;
      }

      return true;
    });
  }, [currentDayData, filterCategory, filterSection, searchQuery]);

  return (
    <div id="schedule-section-root" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Control Deck: Days Tabs, Category Filters, Section Filter & PDF Download */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        
        {/* Top Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Day Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#ffffff', padding: '0.35rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {[
              { day: 1, label: 'Day 1 • Dec 8 (Tue)' },
              { day: 2, label: 'Day 2 • Dec 9 (Wed)' },
              { day: 3, label: 'Day 3 • Dec 10 (Thu)' },
              { day: 4, label: 'Day 4 • Dec 11 (Fri)' },
            ].map(({ day, label }) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeDay === day ? '#0f172a' : 'transparent',
                  color: activeDay === day ? '#ffffff' : '#475569',
                  fontWeight: activeDay === day ? 800 : 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: activeDay === day ? '0 2px 8px rgba(15,23,42,0.2)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Action Tools: Download PDF & Rules Toggle */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: showRules ? '#f1f5f9' : '#ffffff',
                color: '#0f172a',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>📋</span>
              <span>{showRules ? 'Hide Official Rules' : 'Championship Rules & Call Room'}</span>
            </button>

            <a
              href="/docs/order-of-events.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download="VTU_Athletics_Order_of_Events_Final.pdf"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              <span>📄</span>
              <span>Download Official PDF Schedule</span>
            </a>
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
          
          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
            {[
              { id: 'All', label: 'All Disciplines' },
              { id: 'Track', label: 'Track Sprints & Distance' },
              { id: 'Hurdles', label: 'Hurdles' },
              { id: 'Field', label: 'Field (Jumps/Throws)' },
              { id: 'Relay', label: 'Relays (4x100 / 4x400 / Mixed)' },
              { id: 'Combined', label: 'Decathlon & Heptathlon' },
              { id: 'WalkMarathon', label: '20km Walk & 21km Marathon' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterCategory(id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: filterCategory === id ? '#2563eb' : '#e2e8f0',
                  background: filterCategory === id ? '#eff6ff' : '#f8fafc',
                  color: filterCategory === id ? '#1d4ed8' : '#475569',
                  fontWeight: filterCategory === id ? 800 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Section Filter & Search Box */}
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '6px' }}>
              {(['All', 'Men', 'Women', 'Mixed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterSection(s)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: filterSection === s ? '#ffffff' : 'transparent',
                    color: filterSection === s ? '#0f172a' : '#64748b',
                    fontWeight: filterSection === s ? 700 : 500,
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search event, code or round..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.785rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  color: '#0f172a',
                  width: '210px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Official Technical Rules & Guidelines Card (Collapsible) */}
      {showRules && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                VTU State Level Inter Collegiate Athletics Meet
              </span>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 850, color: '#0f172a', margin: '0.15rem 0 0' }}>
                Official Championship Technical Rules &amp; Call Room Regulations
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowRules(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.25rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1rem' }}>
            {OFFICIAL_CHAMPIONSHIP_RULES.map((rule) => (
              <div key={rule.num} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ background: '#0f172a', color: '#ffffff', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                    {rule.num}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    {rule.title}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {rule.text}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.825rem', color: '#1e40af', fontWeight: 700 }}>
              ⏱️ Strict Reporting Mandate: All athletes must report to the Call Room exactly 30 minutes prior to scheduled start time without fail.
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
              Medal Ceremonies: 11:00 AM – 12:00 Noon &bull; 04:30 PM – 05:30 PM
            </div>
          </div>
        </div>
      )}

      {/* Day Headline Banner */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 10px rgba(15,23,42,0.03)' }}>
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            CHAMPIONSHIP TIMETABLE &bull; {currentDayData.date}
          </span>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0.2rem 0 0' }}>
            {currentDayData.title}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.825rem', margin: '0.25rem 0 0' }}>
            Dr. ACS College Synthetic Track Stadium &bull; Medal Slots: Morning {currentDayData.morningMedal} | Evening {currentDayData.eveningMedal}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
            {filteredEvents.length} of {currentDayData.events.length} Events Listed
          </span>
        </div>
      </div>

      {/* Events Schedule Grid */}
      {filteredEvents.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
            No scheduled events match your current filter
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
            Try resetting your category or search term to see all competitions for {currentDayData.title}.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterCategory('All');
              setFilterSection('All');
              setSearchQuery('');
            }}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
          {filteredEvents.map((ev, idx) => {
            const isFinal = ev.round === 'Final';
            const isDecathlon = ev.round === 'Decathlon';
            const isHeptathlon = ev.round === 'Heptathlon';
            const isCeremony = ev.round === 'Ceremony';

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: isFinal ? '1.5px solid #f59e0b' : isCeremony ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.9rem',
                  boxShadow: isFinal ? '0 4px 14px rgba(245, 158, 11, 0.08)' : '0 2px 6px rgba(15,23,42,0.02)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Event Top Bar: Code + Start Time + Round Tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {ev.code > 0 ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#0f172a', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          CODE {ev.code}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#6d28d9', background: '#ede9fe', border: '1px solid #ddd6fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          OFFICIAL
                        </span>
                      )}

                      <span style={{ fontSize: '0.825rem', fontWeight: 850, color: '#2563eb', background: '#eff6ff', padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                        ⏰ {ev.time}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '4px',
                        background: isFinal ? '#fef3c7' : isDecathlon ? '#dbeafe' : isHeptathlon ? '#fce7f3' : isCeremony ? '#ede9fe' : '#f1f5f9',
                        color: isFinal ? '#b45309' : isDecathlon ? '#1e40af' : isHeptathlon ? '#9d174d' : isCeremony ? '#6d28d9' : '#475569',
                        border: isFinal ? '1px solid #fde68a' : isDecathlon ? '1px solid #bfdbfe' : isHeptathlon ? '1px solid #fbcfe8' : '1px solid #e2e8f0',
                      }}
                    >
                      {ev.round}
                    </span>
                  </div>

                  {/* Event Title */}
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 850, color: '#0f172a', lineHeight: 1.3, margin: '0 0 0.35rem' }}>
                    {ev.name}
                  </h4>

                  {/* Specification details if any */}
                  {ev.specification && (
                    <div style={{ fontSize: '0.775rem', color: '#2563eb', fontWeight: 700, marginBottom: '0.4rem' }}>
                      ⚡ {ev.specification}
                    </div>
                  )}

                  {/* Venue location */}
                  <div style={{ fontSize: '0.785rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📍</span>
                    <span>{ev.venue}</span>
                  </div>
                </div>

                {/* Event Footer: Section Pill + Call Room reporting */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: ev.section === 'Men' ? '#dbeafe' : ev.section === 'Women' ? '#fce7f3' : ev.section === 'Mixed' ? '#ede9fe' : '#e2e8f0',
                        color: ev.section === 'Men' ? '#1e40af' : ev.section === 'Women' ? '#9d174d' : ev.section === 'Mixed' ? '#6d28d9' : '#334155',
                      }}
                    >
                      {ev.section}
                    </span>
                    <span style={{ fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      {ev.category}
                    </span>
                  </div>

                  <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.75rem' }}>
                    Call Room: {ev.callRoom}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Note */}
      <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '0.5rem 0' }}>
        Official VTU Order of Events &bull; Verified Timetable from Championship Directorate &bull; Dr. ACS College of Engineering, Bengaluru
      </div>

    </div>
  );
}
