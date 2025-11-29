export interface IHotlinesResponse {
  hotlines: IHotline[];
}

export interface IHotline {
  hotlineName: string;
  hotlineNumber: string;
  regionName: string;
  province: string;
  city: string;
  lastVerified: string;
  category: THotlineCategory;
  alternateNumbers: string[];
}

export type THotlineCategory =
  | 'police_hotlines'
  | 'fire_hotlines'
  | 'medical_hotlines'
  | 'utility_hotlines'
  | 'government_hotlines';
