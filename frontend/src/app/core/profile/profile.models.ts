/** Categoria de uma entrada de portfólio (RF08). */
export type PortfolioCategory = 'EXPERIENCE' | 'EDUCATION' | 'SKILL';

/** Cartão de identidade do publicador (RF07). */
export interface Profile {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

export interface ProfileRequest {
  displayName: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

/** Entrada de portfólio curricular (RF08). */
export interface PortfolioEntry {
  id: string;
  category: PortfolioCategory;
  title: string;
  organization: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  visible: boolean;
  displayOrder: number;
}

export interface PortfolioEntryRequest {
  category: PortfolioCategory;
  title: string;
  organization: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  visible: boolean;
  displayOrder: number;
}
