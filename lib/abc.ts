// ABC / DigiLocker adapter. MOCK. Single exported async function, typed return.
// To integrate the real service: replace the body of verifyWithAbc, keep the signature.
// Every UI surface that renders this result must show the MOCK pill.
import { validateApaar } from './apaar';

export interface AbcResult {
  source: 'MOCK';
  apaarId: string;
  status: 'LINKED' | 'INVALID_ID';
  checkedAt: string;
}

export async function verifyWithAbc(apaarId: string): Promise<AbcResult> {
  const c = validateApaar(apaarId);
  return {
    source: 'MOCK',
    apaarId,
    status: c.formatOk && c.checksumOk ? 'LINKED' : 'INVALID_ID',
    checkedAt: new Date().toISOString(),
  };
}
