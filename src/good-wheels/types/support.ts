export type SupportCategoryId =
  | 'medical_transport'
  | 'family_assistance'
  | 'school_ride'
  | 'elder_help'
  | 'shelter_support'
  | 'accessibility_support'
  | 'community_errand'
  | 'emergency_support'
  | 'volunteer_task'
  | 'child_family_safety'
  | 'lost_found_transport';

export type SupportCategory = {
  id: SupportCategoryId;
  label: string;
  description: string;
  tone: 'trust' | 'safe' | 'pending' | 'urgent';
};

