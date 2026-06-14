
export type DeviceType = 'monopolar' | 'bipolar' | 'tripolar' | 'tetrapolar' | 'idr_bipolar' | 'idr_tetrapolar' | 'dps' | 'empty';

export type Brand = 'Schneider' | 'WEG' | 'Steck' | 'Siemens' | 'General';

export interface QDCComponent {
  id: string;
  type: DeviceType;
  brand: Brand;
  current: number; // In Amperes
  label: string; // User label (e.g., "Ar Condicionado")
  phases: 1 | 2 | 3; // Number of phases used by device
  phase?: 'R' | 'S' | 'T' | 'RS' | 'RST'; // Which phase(s) it is connected to
  width: number; // Width in DIN modules
  railIndex: number; // Which rail it belongs to (0, 1, 2)
  rating?: string;
  leakageCurrent?: number;
}

export interface QDCBoard {
  id: string;
  name: string;
  numRails: number; // Number of DIN rails (1, 2, 3)
  maxModulesPerRail: number; // Capacity per rail
  components: QDCComponent[];
  createdAt: number;
}
