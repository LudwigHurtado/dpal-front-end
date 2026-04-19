export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface Mission {
  id: string;
  title: string;
  categoryId: string;
  locationId: string;
  description: string;
  rewardPoints: number;
  rewardXp: number;
  urgency: Urgency;
  proofRequired: string;
  relatedItemIds: string[];
  checklist: ChecklistItem[];
}

// Each checklist is a fresh template — MissionActionScene clones and mutates its own copy.
export const missions: Mission[] = [
  // ── Road Hazards ──────────────────────────────────────────────────────────
  {
    id: 'm01',
    title: 'Verify Pothole on Oak St',
    categoryId: 'road_hazards',
    locationId: 'loc_01',
    description:
      'Residents reported a large pothole at Oak Street & 3rd Ave causing vehicle damage. Confirm GPS location, document size, and collect photo proof.',
    rewardPoints: 50,
    rewardXp: 120,
    urgency: 'high',
    proofRequired: 'Geotagged photo with reference object for scale',
    relatedItemIds: ['ri_cone', 'ri_caution', 'ri_pin', 'ri_damage_photo'],
    checklist: [
      { id: 'c1', label: 'Confirm GPS location', completed: false },
      { id: 'c2', label: 'Inspect and estimate pothole size', completed: false },
      { id: 'c3', label: 'Place temporary safety marker', completed: false },
      { id: 'c4', label: 'Upload photo evidence', completed: false },
    ],
  },
  {
    id: 'm02',
    title: 'Report Broken Street Sign',
    categoryId: 'road_hazards',
    locationId: 'loc_01',
    description:
      'Stop sign at Oak & 5th Ave is bent and barely visible after a recent storm. Poses a safety risk to drivers and pedestrians.',
    rewardPoints: 35,
    rewardXp: 80,
    urgency: 'medium',
    proofRequired: 'Photo of damaged or missing sign',
    relatedItemIds: ['ri_caution', 'ri_pin'],
    checklist: [
      { id: 'c1', label: 'Locate and identify the sign', completed: false },
      { id: 'c2', label: 'Document sign condition', completed: false },
      { id: 'c3', label: 'Upload photo proof', completed: false },
    ],
  },
  // ── Lost Pets ─────────────────────────────────────────────────────────────
  {
    id: 'm03',
    title: 'Search Park for Lost Dog Clue',
    categoryId: 'lost_pets',
    locationId: 'loc_02',
    description:
      'Bella, a golden retriever, has been missing for 3 days. Last seen near Central Park West. Search trails and shelters for any signs.',
    rewardPoints: 60,
    rewardXp: 150,
    urgency: 'high',
    proofRequired: 'Witness statement or photo near last known location',
    relatedItemIds: ['ri_flyer', 'ri_collar', 'ri_witness', 'ri_shelter'],
    checklist: [
      { id: 'c1', label: 'Check main park trails', completed: false },
      { id: 'c2', label: 'Review posted flyers in area', completed: false },
      { id: 'c3', label: 'Interview nearby witnesses', completed: false },
      { id: 'c4', label: 'Contact local animal shelter', completed: false },
    ],
  },
  {
    id: 'm04',
    title: 'Confirm Pet Flyer Placement',
    categoryId: 'lost_pets',
    locationId: 'loc_02',
    description:
      'Lost cat flyers posted by the owner may have been removed. Verify that flyers are visible at key bulletin boards in the park.',
    rewardPoints: 25,
    rewardXp: 60,
    urgency: 'low',
    proofRequired: 'Photo of visible flyer at location',
    relatedItemIds: ['ri_flyer', 'ri_pin'],
    checklist: [
      { id: 'c1', label: 'Visit bulletin board locations', completed: false },
      { id: 'c2', label: 'Confirm flyers are still posted', completed: false },
      { id: 'c3', label: 'Replace any missing flyers', completed: false },
    ],
  },
  // ── Environmental ─────────────────────────────────────────────────────────
  {
    id: 'm05',
    title: 'Verify Illegal Dumping Site',
    categoryId: 'environmental',
    locationId: 'loc_03',
    description:
      'Reports of illegal dumping near Riverside Industrial zone. Waste may contain hazardous materials. Document only — do not touch.',
    rewardPoints: 70,
    rewardXp: 180,
    urgency: 'critical',
    proofRequired: 'Geotagged photo + volume estimate (small / medium / large)',
    relatedItemIds: ['ri_trash', 'ri_hazard_tag', 'ri_bag', 'ri_pin'],
    checklist: [
      { id: 'c1', label: 'Confirm GPS coordinates', completed: false },
      { id: 'c2', label: 'Photograph waste pile safely', completed: false },
      { id: 'c3', label: 'Estimate volume (S / M / L)', completed: false },
      { id: 'c4', label: 'Flag potential hazardous materials', completed: false },
    ],
  },
  {
    id: 'm06',
    title: 'Report Water Contamination Risk',
    categoryId: 'environmental',
    locationId: 'loc_03',
    description:
      'Discolored water near the River drainage channel. Possible industrial runoff. Collect visual evidence and note odor / color.',
    rewardPoints: 80,
    rewardXp: 200,
    urgency: 'critical',
    proofRequired: 'Photo + written description of odor and color',
    relatedItemIds: ['ri_water_warn', 'ri_hazard_tag', 'ri_bag'],
    checklist: [
      { id: 'c1', label: 'Locate drainage channel', completed: false },
      { id: 'c2', label: 'Document water discoloration', completed: false },
      { id: 'c3', label: 'Note odor and visual appearance', completed: false },
      { id: 'c4', label: 'Upload complete evidence package', completed: false },
    ],
  },
  // ── Education ─────────────────────────────────────────────────────────────
  {
    id: 'm07',
    title: 'Confirm Classroom Supply Shortage',
    categoryId: 'education',
    locationId: 'loc_04',
    description:
      'Lincoln Elementary teachers report a critical shortage of notebooks, pencils, and art supplies. Verify and document current stock levels.',
    rewardPoints: 45,
    rewardXp: 100,
    urgency: 'medium',
    proofRequired: 'Photo of supply cabinet + estimated inventory count',
    relatedItemIds: ['ri_backpack', 'ri_supply_box', 'ri_desk'],
    checklist: [
      { id: 'c1', label: 'Visit school supply room', completed: false },
      { id: 'c2', label: 'Count available supplies by type', completed: false },
      { id: 'c3', label: 'Photograph supply area', completed: false },
      { id: 'c4', label: 'Submit inventory report', completed: false },
    ],
  },
  {
    id: 'm08',
    title: 'Report Unsafe School Condition',
    categoryId: 'education',
    locationId: 'loc_04',
    description:
      'Broken bathroom door lock at Lincoln Elementary — students lack privacy and safety. Confirm exact location and severity of the issue.',
    rewardPoints: 40,
    rewardXp: 90,
    urgency: 'high',
    proofRequired: 'Photo of broken fixture',
    relatedItemIds: ['ri_broken_sign', 'ri_desk'],
    checklist: [
      { id: 'c1', label: 'Locate the reported bathroom', completed: false },
      { id: 'c2', label: 'Document broken lock or fixture', completed: false },
      { id: 'c3', label: 'Upload photo evidence', completed: false },
    ],
  },
];

export function getMissionById(id: string): Mission | undefined {
  return missions.find(m => m.id === id);
}

export function getMissionsByLocation(locationId: string): Mission[] {
  return missions.filter(m => m.locationId === locationId);
}

/** Returns a deep clone of a mission's checklist so each run is independent. */
export function cloneChecklist(mission: Mission): ChecklistItem[] {
  return mission.checklist.map(item => ({ ...item, completed: false }));
}
