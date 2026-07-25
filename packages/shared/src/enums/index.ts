export enum CowStatus {
  ACTIVE = 'Active',
  SOLD = 'Sold',
  DECEASED = 'Deceased',
  DRY = 'Dry',
}

export enum Breed {
  GIR = 'Gir',
  MALNADGIDDA = 'Malnadgidda',
  PUNGANUR_MIX = 'Punganur mix',
}

export enum RegistrationMethod {
  AI = 'AI',
  NATURAL = 'NATURAL',
}

export enum VaccinationType {
  DEWORMING = 'Deworming',
  FMD = 'Vaccination (FMD)',
  LSD = 'LSD',
  BRUCELLOSIS = 'Brucellosis',
  IBR = 'IBR',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  WORKER = 'worker',
}

export enum MilkSession {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
}
