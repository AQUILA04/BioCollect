export type FingerprintCapture = {
  fingerType: string;
  imageBase64: string;
  nfiqScore: number;
};

/** Implemented by platform-specific Miaxis and future scanner providers. */
export interface BiometricScannerProvider {
  isAvailable(): Promise<boolean>;
  capture(fingerType: string): Promise<FingerprintCapture>;
}
