/**
 * Official VTU Inter-Collegiate Athletics Championship Event Catalogue & Schedule Constants
 * Derived with 100% fidelity from the official "Order of Events.pdf"
 */

export interface OfficialEventDefinition {
  code: number;
  name: string;
  sections: 'Men & Women' | 'Men' | 'Women' | 'Mix Relay';
  category: 'Track' | 'Hurdles' | 'Field Throw' | 'Field Jump' | 'Race Walk' | 'Relay' | 'Road' | 'Combined';
  specification?: string;
}

export const OFFICIAL_CHAMPIONSHIP_EVENTS: OfficialEventDefinition[] = [
  { code: 1, name: '100 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 2, name: '200 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 3, name: '400 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 4, name: '800 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 5, name: '1500 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 6, name: '5000 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 7, name: '10000 mtrs Run', sections: 'Men & Women', category: 'Track' },
  { code: 8, name: '110 mtrs Hurdles', sections: 'Men', category: 'Hurdles', specification: '0.914 mtr' },
  { code: 9, name: '100 mtrs Hurdles', sections: 'Women', category: 'Hurdles', specification: '0.838 mtr' },
  { code: 10, name: '400 mtrs Hurdles', sections: 'Men & Women', category: 'Hurdles', specification: '0.914m (Men) / 0.762m (Women)' },
  { code: 11, name: 'Shot Put', sections: 'Men & Women', category: 'Field Throw', specification: '7.260 kg (Men) / 4.00 kg (Women)' },
  { code: 12, name: 'Discus Throw', sections: 'Men & Women', category: 'Field Throw', specification: '2.0 kg (Men) / 1.0 kg (Women)' },
  { code: 13, name: 'Javelin Throw', sections: 'Men & Women', category: 'Field Throw', specification: '800 gm (Men) / 600 gm (Women)' },
  { code: 14, name: 'Hammer Throw', sections: 'Men & Women', category: 'Field Throw', specification: '7.260 kg (Men) / 4.00 kg (Women)' },
  { code: 15, name: 'Long Jump', sections: 'Men & Women', category: 'Field Jump' },
  { code: 16, name: 'High Jump', sections: 'Men & Women', category: 'Field Jump' },
  { code: 17, name: 'Triple Jump', sections: 'Men & Women', category: 'Field Jump' },
  { code: 18, name: 'Pole Vault', sections: 'Men & Women', category: 'Field Jump' },
  { code: 19, name: '20 km Walk', sections: 'Men & Women', category: 'Race Walk' },
  { code: 20, name: '4x100 mtrs Relay', sections: 'Men & Women', category: 'Relay' },
  { code: 21, name: '4x400 mtrs Relay', sections: 'Men & Women', category: 'Relay' },
  { code: 22, name: '4x400 mtrs Mix Relay', sections: 'Mix Relay', category: 'Relay', specification: 'Leg 1: W • Leg 2: M • Leg 3: W • Leg 4: M' },
  { code: 23, name: '21 km Half Marathon', sections: 'Men & Women', category: 'Road' },
  { code: 24, name: 'Decathlon', sections: 'Men', category: 'Combined', specification: '10 Disciplines (Day 2 & Day 3)' },
  { code: 25, name: 'Heptathlon', sections: 'Women', category: 'Combined', specification: '7 Disciplines (Day 2 & Day 3)' },
];

/**
 * Maps database event codes (e.g., '100M-M', 'SP-W', 'DEC-M') to official PDF event metadata
 */
export const DB_CODE_TO_OFFICIAL_MAP: Record<string, { codeNum: number; officialName: string; section: 'Men' | 'Women' | 'Mixed'; categoryGroup: string }> = {
  '100M-M': { codeNum: 1, officialName: '100 mtrs Run', section: 'Men', categoryGroup: 'Track Sprints' },
  '100M-W': { codeNum: 1, officialName: '100 mtrs Run', section: 'Women', categoryGroup: 'Track Sprints' },
  '200M-M': { codeNum: 2, officialName: '200 mtrs Run', section: 'Men', categoryGroup: 'Track Sprints' },
  '200M-W': { codeNum: 2, officialName: '200 mtrs Run', section: 'Women', categoryGroup: 'Track Sprints' },
  '400M-M': { codeNum: 3, officialName: '400 mtrs Run', section: 'Men', categoryGroup: 'Track Sprints' },
  '400M-W': { codeNum: 3, officialName: '400 mtrs Run', section: 'Women', categoryGroup: 'Track Sprints' },
  '800M-M': { codeNum: 4, officialName: '800 mtrs Run', section: 'Men', categoryGroup: 'Middle Distance' },
  '800M-W': { codeNum: 4, officialName: '800 mtrs Run', section: 'Women', categoryGroup: 'Middle Distance' },
  '1500M-M': { codeNum: 5, officialName: '1500 mtrs Run', section: 'Men', categoryGroup: 'Middle Distance' },
  '1500M-W': { codeNum: 5, officialName: '1500 mtrs Run', section: 'Women', categoryGroup: 'Middle Distance' },
  '5000M-M': { codeNum: 6, officialName: '5000 mtrs Run', section: 'Men', categoryGroup: 'Long Distance' },
  '5000M-W': { codeNum: 6, officialName: '5000 mtrs Run', section: 'Women', categoryGroup: 'Long Distance' },
  '10000M-M': { codeNum: 7, officialName: '10,000 mtrs Run', section: 'Men', categoryGroup: 'Long Distance' },
  '10000M-W': { codeNum: 7, officialName: '10,000 mtrs Run', section: 'Women', categoryGroup: 'Long Distance' },
  '110H-M': { codeNum: 8, officialName: '110 mtrs Hurdles (0.914m)', section: 'Men', categoryGroup: 'Hurdles' },
  '100H-W': { codeNum: 9, officialName: '100 mtrs Hurdles (0.838m)', section: 'Women', categoryGroup: 'Hurdles' },
  '400H-M': { codeNum: 10, officialName: '400 mtrs Hurdles (0.914m)', section: 'Men', categoryGroup: 'Hurdles' },
  '400H-W': { codeNum: 10, officialName: '400 mtrs Hurdles (0.762m)', section: 'Women', categoryGroup: 'Hurdles' },
  'SP-M': { codeNum: 11, officialName: 'Shot Put (7.260 kg)', section: 'Men', categoryGroup: 'Field Throws' },
  'SP-W': { codeNum: 11, officialName: 'Shot Put (4.00 kg)', section: 'Women', categoryGroup: 'Field Throws' },
  'DT-M': { codeNum: 12, officialName: 'Discus Throw (2.0 kg)', section: 'Men', categoryGroup: 'Field Throws' },
  'DT-W': { codeNum: 12, officialName: 'Discus Throw (1.0 kg)', section: 'Women', categoryGroup: 'Field Throws' },
  'JT-M': { codeNum: 13, officialName: 'Javelin Throw (800 gm)', section: 'Men', categoryGroup: 'Field Throws' },
  'JT-W': { codeNum: 13, officialName: 'Javelin Throw (600 gm)', section: 'Women', categoryGroup: 'Field Throws' },
  'HT-M': { codeNum: 14, officialName: 'Hammer Throw (7.260 kg)', section: 'Men', categoryGroup: 'Field Throws' },
  'HT-W': { codeNum: 14, officialName: 'Hammer Throw (4.00 kg)', section: 'Women', categoryGroup: 'Field Throws' },
  'LJ-M': { codeNum: 15, officialName: 'Long Jump', section: 'Men', categoryGroup: 'Field Jumps' },
  'LJ-W': { codeNum: 15, officialName: 'Long Jump', section: 'Women', categoryGroup: 'Field Jumps' },
  'HJ-M': { codeNum: 16, officialName: 'High Jump', section: 'Men', categoryGroup: 'Field Jumps' },
  'HJ-W': { codeNum: 16, officialName: 'High Jump', section: 'Women', categoryGroup: 'Field Jumps' },
  'TJ-M': { codeNum: 17, officialName: 'Triple Jump', section: 'Men', categoryGroup: 'Field Jumps' },
  'TJ-W': { codeNum: 17, officialName: 'Triple Jump', section: 'Women', categoryGroup: 'Field Jumps' },
  'PV-M': { codeNum: 18, officialName: 'Pole Vault', section: 'Men', categoryGroup: 'Field Jumps' },
  'PV-W': { codeNum: 18, officialName: 'Pole Vault', section: 'Women', categoryGroup: 'Field Jumps' },
  '20KM-W-M': { codeNum: 19, officialName: '20,000 mtr Walk Race', section: 'Men', categoryGroup: 'Race Walk' },
  '20KM-W-W': { codeNum: 19, officialName: '20,000 mtr Walk Race', section: 'Women', categoryGroup: 'Race Walk' },
  '4X100M-M': { codeNum: 20, officialName: '4 x 100 mtr Relay', section: 'Men', categoryGroup: 'Relay' },
  '4X100M-W': { codeNum: 20, officialName: '4 x 100 mtr Relay', section: 'Women', categoryGroup: 'Relay' },
  '4X400M-M': { codeNum: 21, officialName: '4 x 400 mtr Relay', section: 'Men', categoryGroup: 'Relay' },
  '4X400M-W': { codeNum: 21, officialName: '4 x 400 mtr Relay', section: 'Women', categoryGroup: 'Relay' },
  '4X400M-MIX': { codeNum: 22, officialName: '4 x 400 mtr Mixed Relay', section: 'Mixed', categoryGroup: 'Relay' },
  'HM-M': { codeNum: 23, officialName: '21km Half Marathon', section: 'Men', categoryGroup: 'Road & Marathon' },
  'HM-W': { codeNum: 23, officialName: '21km Half Marathon', section: 'Women', categoryGroup: 'Road & Marathon' },
  'DEC-M': { codeNum: 24, officialName: 'Decathlon (10 Disciplines)', section: 'Men', categoryGroup: 'Combined Events' },
  'HEP-W': { codeNum: 25, officialName: 'Heptathlon (7 Disciplines)', section: 'Women', categoryGroup: 'Combined Events' },
};

/**
 * Official Championship Rules & Notes (Page 5 of Order of Events.pdf)
 */
export const OFFICIAL_CHAMPIONSHIP_RULES = [
  {
    num: 1,
    title: 'Schedule Alterations',
    text: 'Order of events and timings are subject to alteration by the Championship Directorate.',
  },
  {
    num: 2,
    title: 'Heats Recasting',
    text: 'Heats may be reshuffled or recast based on verified athlete reporting numbers.',
  },
  {
    num: 3,
    title: 'Event Quotas & Mixed Relay Rules',
    text: 'Athletes can take part in any two individual events and one relay event (4x100m or 4x400m relay). 4x400m mixed relay is a common event and any two men and women athletes of the team can take part (Leg 1 – Women, Leg 2 – Men, Leg 3 – Women, Leg 4 – Men).',
  },
  {
    num: 4,
    title: 'Strict Call Room Reporting (30 Mins)',
    text: 'All athletes are strictly informed to report in the Call Room 30 minutes prior to the respective event without fail. Failure to report results in automatic scratching.',
  },
  {
    num: 5,
    title: 'Long Distance Cut-Off (Top 10)',
    text: 'In long distance races (5000m, 10,000m), the race will be stopped once the best 10 athletes complete the race. Remaining runners will be asked to stop and vacate the track to save time.',
  },
  {
    num: 6,
    title: 'Half Marathon & Walk Race 3-Lap Overlap Rule',
    text: 'In the half marathon and 20km walk race, if any athlete lags more than 3 laps behind the leaders, they will be asked to stop and vacate the track to save time and avoid overlapping confusions.',
  },
  {
    num: 7,
    title: 'Compulsory Marchpast Participation',
    text: 'Participation of all athletes and managers/coaches in the inaugural Marchpast is compulsory. Only contingents participating in the Marchpast will be permitted to compete in athletics events.',
  },
  {
    num: 8,
    title: 'Mixed Relay Championship Points',
    text: 'Mixed relay points will be considered for the Overall Championship Trophy only, and not for the Men or Women divisional championships.',
  },
];
