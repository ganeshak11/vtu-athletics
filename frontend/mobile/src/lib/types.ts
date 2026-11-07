export type ScheduleEntry = {
  key: string;
  eventId: string;
  eventName: string;
  eventCode: string;
  category: string;
  /** registration kind: regular | reserve | relay | half_marathon */
  kind: string;
  stage: string | null;
  heatNumber: number | null;
  lane: number | null;
  relayLeg: number | null;
  isRelayReserve: boolean;
  sessionName: string | null;
  /** ISO timestamps with +05:30 offset */
  startAt: string | null;
  callRoomAt: string | null;
  callRoomEstimated: boolean;
  status: string;
  reported: boolean;
};

export type AthleteMe = {
  serverTime: string;
  athlete: {
    id: string;
    name: string;
    usn: string;
    bibNumber: number | null;
    gender: 'men' | 'women' | null;
    bloodGroup: string | null;
    semester: number | null;
    photoUrl: string | null;
    accreditationStatus: string;
    accreditedAt: string | null;
    college: { id: string; name: string; code: string; district: string | null } | null;
    squadCode: string | null;
    qrToken: string;
  };
  events: { kind: string; id: string; name: string; code: string; category: string }[];
  schedule: ScheduleEntry[];
  hostel: {
    name: string | null;
    roomRange: string | null;
    notes: string | null;
    checkedIn: boolean;
    room: string | null;
    checkedInAt: string | null;
  } | null;
  meals: { date: string; claimed: { mealType: string; at: string }[] };
};
