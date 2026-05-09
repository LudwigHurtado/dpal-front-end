export type CharityImpactCategory = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon?: string;
};

export const charityImpactCategories: CharityImpactCategory[] = [
  {
    id: 'senior-citizens',
    title: 'Senior Citizens',
    subtitle: 'Help support elders, rest homes, meals, and dignity care.',
    description:
      'Your ride can help local senior citizens, rest homes, transportation needs, meals, and care programs.',
    icon: '👵',
  },
  {
    id: 'children-homes',
    title: "Children's Homes",
    subtitle: 'Help support orphanages, children’s shelters, school supplies, and meals.',
    description:
      'Your ride can help children’s homes, orphanages, school supplies, safe housing, and local child support programs.',
    icon: '🏠',
  },
  {
    id: 'animal-shelters',
    title: 'Animal Shelters',
    subtitle: 'Help shelter dogs, rescued pets, food, care, and adoption support.',
    description:
      'Your ride can help animal shelters, rescued dogs, pet food, emergency care, and adoption support.',
    icon: '🐕',
  },
  {
    id: 'environment',
    title: 'Environment',
    subtitle: 'Help clean neighborhoods, protect water, plant trees, and restore local areas.',
    description:
      'Your ride can support cleanup missions, river protection, trees, recycling, and local environmental restoration.',
    icon: '🌳',
  },
  {
    id: 'families-in-need',
    title: 'Families in Need',
    subtitle: 'Help local families with food, clothing, and emergency support.',
    description:
      'Your ride can help families with food baskets, clothing, urgent assistance, and local care programs.',
    icon: '🤝',
  },
];
