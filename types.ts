export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  USER = 'user',
  TEAM_MEMBER = 'team_member',
}

export enum PortalType {
  LTS = 'LTS',
  STRATEGY = 'STRATEGIA',
}

export enum PlanSection {
  SUMMARY = 'Tiivistelmä',
  BUSINESS_IDEA = 'Liikeidea',
  EXTERNAL_ENV = 'Ulkoinen toimintaympäristö',
  INTERNAL_ENV = 'Sisäinen toimintaympäristö',
  STRATEGY_VISION = 'Strategia ja visio',
  BUSINESS_MODEL = 'Liiketoimintamalli',
  SALES_MARKETING = 'Markkinointi & myynti',
  PRODUCTS_SERVICES = 'Tuotteet ja palvelut',
  PROFITABILITY = 'Kannattavuus',
  PERSONNEL = 'Henkilöstö',
  LASKELMAT = 'Laskelmat',
  HALLINTO = 'Hallinto',
  CONTRIBUTION = 'Projektini',
  DOWNLOAD = 'LATAA',
}

export interface Invite {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  portalType?: PortalType;
  companyName?: string;
  invitedBy: string;
  createdAt: string;
  used: boolean;
  canInviteTeamMembers?: boolean;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  portalType?: PortalType;
  companyName?: string;
  invitedBy?: string;
  teamMembers?: { name: string; email: string }[];
  profileImage?: string;
  backgroundInfo?: string;
  canInviteTeamMembers?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  volume: number;
}

export interface PersonnelExpense {
  id: string;
  role: string;
  salary: number;
  count: number;
}

export interface MarketingExpense {
  id: string;
  activity: string;
  monthlyCost: number;
}

export interface AdminExpense {
  id: string;
  item: string;
  monthlyCost: number;
}

export interface Investment {
  id: string;
  description: string;
  amount: number;
  year: number;
}

export interface BuyerPersona {
  id: string;
  name: string;
  description: string;
  painPoints: string;
  goals: string;
}

export interface BusinessPlan {
  products: Product[];
  personnel: PersonnelExpense[];
  marketing: MarketingExpense[];
  admin: AdminExpense[];
  investments: Investment[];
  buyerPersonas?: BuyerPersona[];
  [key: string]: any;
}

export interface SystemLink {
  id: string;
  title: string;
  url: string;
  category: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  category: string;
  description?: string;
}

export interface SystemKnowledge {
  links: SystemLink[];
  documents: DocumentFile[];
  instructions: string;
}
