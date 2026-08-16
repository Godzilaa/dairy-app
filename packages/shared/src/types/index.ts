import type {
  CowStatus,
  Breed,
  RegistrationMethod,
  VaccinationType,
  Gender,
  UserRole,
  MilkSession,
  SyncStatus,
} from '../enums';

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cow {
  id: string;
  cowId: string;
  pashuAadhar?: string;
  name: string;
  breed: Breed;
  dob?: string;
  mother?: string;
  father?: string;
  status: CowStatus;
  photo?: string;
  registrationMethod?: RegistrationMethod;
  insuranceId?: string;
  pregnancyCount?: number; // number of times the cow has been pregnant / calved
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthRecord {
  id: string;
  cowId: string;
  vaccinationType: VaccinationType;
  date?: string;
  nextDueDate?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReproductionFemale {
  id: string;
  cowId: string;
  heatDate?: string;
  aiDate?: string;
  pregnancyCheck?: string;
  expectedCalving?: string;
  method?: RegistrationMethod;
  amount?: number;
  doneBy?: string;
  session?: MilkSession;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReproductionMale {
  id: string;
  cowId: string;
  heatDate?: string;
  serviceDate?: string;
  pregnancyCheck?: string;
  expectedCalving?: string;
  amount?: number;
  doneBy?: string;
  session?: MilkSession;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MilkFeedRecord {
  id: string;
  cowId: string;
  milkingDate: string;
  dryDate?: string;
  morningMilk?: number;
  eveningMilk?: number;
  feedGiven?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Calf {
  id: string;
  cowId: string;
  name: string;
  breed: Breed;
  mother?: string;
  father?: string;
  dob?: string;
  gender: Gender;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceRecord {
  id: string;
  cowId: string;
  insuredOn?: string;
  insuredTill?: string;
  insuredWith?: string;
  insuredBy?: string;
  amount?: number;
  claimAmount?: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}
