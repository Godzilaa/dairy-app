export interface CreateCowDto {
  name: string;
  breed: string;
  pashuAadhar?: string;
  dob?: string;
  mother?: string;
  father?: string;
  photo?: string;
  registrationMethod?: string;
}

export interface UpdateCowDto {
  name?: string;
  breed?: string;
  pashuAadhar?: string;
  dob?: string;
  mother?: string;
  father?: string;
  status?: string;
  photo?: string;
  registrationMethod?: string;
}

export interface CreateHealthRecordDto {
  cowId: string;
  vaccinationType: string;
  date?: string;
  nextDueDate?: string;
  notes?: string;
}

export interface CreateMilkFeedDto {
  cowId: string;
  milkingDate: string;
  dryDate?: string;
  morningMilk?: number;
  eveningMilk?: number;
  feedGiven?: string;
  notes?: string;
}

export interface CreateReproductionFemaleDto {
  cowId: string;
  heatDate?: string;
  aiDate?: string;
  pregnancyCheck?: string;
  expectedCalving?: string;
  method?: string;
  amount?: number;
  doneBy?: string;
  session?: string;
}

export interface CreateReproductionMaleDto {
  cowId: string;
  heatDate?: string;
  serviceDate?: string;
  pregnancyCheck?: string;
  expectedCalving?: string;
  amount?: number;
  doneBy?: string;
  session?: string;
}

export interface CreateCalfDto {
  cowId: string;
  name: string;
  breed: string;
  mother?: string;
  father?: string;
  dob?: string;
  gender: string;
}

export interface CreateInsuranceDto {
  cowId: string;
  insuredOn?: string;
  insuredTill?: string;
  insuredWith?: string;
  insuredBy?: string;
  amount?: number;
  claimAmount?: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

export interface SyncPayload {
  cows: any[];
  healthRecords: any[];
  reproductionFemales: any[];
  reproductionMales: any[];
  milkFeeds: any[];
  calves: any[];
  insuranceRecords: any[];
  lastSyncedAt: string;
}

export interface SyncResponse {
  serverTime: string;
  changes: {
    cows: any[];
    healthRecords: any[];
    reproductionFemales: any[];
    reproductionMales: any[];
    milkFeeds: any[];
    calves: any[];
    insuranceRecords: any[];
  };
}
