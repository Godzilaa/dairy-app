import { pashuAadharApi } from './api';

interface PashuAadharRecord {
  tagId: string;
  species?: string;
  breed?: string;
  name?: string;
  dob?: string;
  gender?: string;
  ownerName?: string;
  ownerPhone?: string;
  village?: string;
  district?: string;
  state?: string;
}

export const lookupPashuAadhar = async (tagId: string): Promise<PashuAadharRecord | null> => {
  if (!tagId || tagId.length < 12) return null;
  try {
    return await pashuAadharApi.lookup(tagId);
  } catch {
    return null;
  }
};
