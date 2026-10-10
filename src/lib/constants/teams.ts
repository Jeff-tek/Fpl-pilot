export interface ClubStyle {
  shortName: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

export const CLUB_STYLES: Record<string, ClubStyle> = {
  ARS: { shortName: 'ARS', name: 'Arsenal', primaryColor: '#EF0107', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  AVL: { shortName: 'AVL', name: 'Aston Villa', primaryColor: '#670E36', secondaryColor: '#95BFE5', textColor: '#FFFFFF' },
  BOU: { shortName: 'BOU', name: 'Bournemouth', primaryColor: '#DA291C', secondaryColor: '#000000', textColor: '#FFFFFF' },
  BRE: { shortName: 'BRE', name: 'Brentford', primaryColor: '#E30613', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  BHA: { shortName: 'BHA', name: 'Brighton', primaryColor: '#0057B8', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  CHE: { shortName: 'CHE', name: 'Chelsea', primaryColor: '#034694', secondaryColor: '#EE242C', textColor: '#FFFFFF' },
  CRY: { shortName: 'CRY', name: 'Crystal Palace', primaryColor: '#1B458F', secondaryColor: '#C4122E', textColor: '#FFFFFF' },
  EVE: { shortName: 'EVE', name: 'Everton', primaryColor: '#003399', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  FUL: { shortName: 'FUL', name: 'Fulham', primaryColor: '#000000', secondaryColor: '#CC0000', textColor: '#FFFFFF' },
  IPS: { shortName: 'IPS', name: 'Ipswich', primaryColor: '#002B49', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  LEI: { shortName: 'LEI', name: 'Leicester', primaryColor: '#003090', secondaryColor: '#FDBE11', textColor: '#FFFFFF' },
  LIV: { shortName: 'LIV', name: 'Liverpool', primaryColor: '#C8102E', secondaryColor: '#00B2A9', textColor: '#FFFFFF' },
  MCI: { shortName: 'MCI', name: 'Man City', primaryColor: '#6CABDD', secondaryColor: '#1C2C5B', textColor: '#1C2C5B' },
  MUN: { shortName: 'MUN', name: 'Man Utd', primaryColor: '#DA291C', secondaryColor: '#FBE122', textColor: '#FFFFFF' },
  NEW: { shortName: 'NEW', name: 'Newcastle', primaryColor: '#241F20', secondaryColor: '#41B6E6', textColor: '#FFFFFF' },
  NFO: { shortName: 'NFO', name: 'Nott\'m Forest', primaryColor: '#DD0000', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  SOU: { shortName: 'SOU', name: 'Southampton', primaryColor: '#D71920', secondaryColor: '#130C0E', textColor: '#FFFFFF' },
  TOT: { shortName: 'TOT', name: 'Spurs', primaryColor: '#132257', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  WHU: { shortName: 'WHU', name: 'West Ham', primaryColor: '#7A263A', secondaryColor: '#1BB1E7', textColor: '#FFFFFF' },
  WOL: { shortName: 'WOL', name: 'Wolves', primaryColor: '#FDB913', secondaryColor: '#231F20', textColor: '#231F20' },
};

export function getClubStyle(shortName: string): ClubStyle {
  return CLUB_STYLES[shortName] || {
    shortName: shortName || 'PL',
    name: shortName || 'Premier League',
    primaryColor: '#334155',
    secondaryColor: '#64748B',
    textColor: '#FFFFFF',
  };
}

/**
 * Returns color-blind friendly styling for FDR (Fixture Difficulty Rating 1 to 5)
 */
export function getFDRBadgeStyle(fdr: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (fdr) {
    case 1:
      return { bg: 'bg-emerald-600', text: 'text-emerald-50', border: 'border-emerald-500', label: 'Very Easy' };
    case 2:
      return { bg: 'bg-emerald-700', text: 'text-emerald-100', border: 'border-emerald-600', label: 'Easy' };
    case 3:
      return { bg: 'bg-slate-700', text: 'text-slate-200', border: 'border-slate-600', label: 'Medium' };
    case 4:
      return { bg: 'bg-amber-700', text: 'text-amber-100', border: 'border-amber-600', label: 'Hard' };
    case 5:
      return { bg: 'bg-rose-700', text: 'text-rose-100', border: 'border-rose-600', label: 'Very Hard' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700', label: 'Unknown' };
  }
}
