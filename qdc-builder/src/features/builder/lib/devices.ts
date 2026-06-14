
import { Brand, DeviceType } from '../types';

export interface DeviceDefinition {
  id: string;
  name: string;
  type: DeviceType;
  brand: Brand;
  width: number; // in modules
  image: string;
  defaultCurrent: number;
}

export const DEVICE_CATALOG: DeviceDefinition[] = [
  {
    id: 'schneider-ic60-1p',
    name: 'Disjuntor Monopolar iC60N',
    type: 'monopolar',
    brand: 'Schneider',
    width: 1,
    image: '/images/devices/schneider.png',
    defaultCurrent: 16
  },
  {
    id: 'weg-mdw-1p',
    name: 'Disjuntor Monopolar MDW',
    type: 'monopolar',
    brand: 'WEG',
    width: 1,
    image: '/images/devices/weg.png',
    defaultCurrent: 16
  },
  {
    id: 'idr-tetrapolar',
    name: 'IDR Tetrapolar',
    type: 'idr_tetrapolar',
    brand: 'General',
    width: 4,
    image: '/images/devices/idr.png',
    defaultCurrent: 40
  },
  {
    id: 'dps-generic',
    name: 'DPS Classe II',
    type: 'dps',
    brand: 'General',
    width: 1,
    image: '/images/devices/dps.png',
    defaultCurrent: 0
  },
  {
    id: 'busbar-neutral',
    name: 'Barramento Neutro',
    type: 'idr_tetrapolar', // using idr as base for width/shape
    brand: 'General',
    width: 1,
    image: 'https://img.ltwebstatic.com/images3_pi/2022/05/26/165355653491410134444.jpg',
    defaultCurrent: 0
  },
  {
    id: 'busbar-ground',
    name: 'Barramento Terra',
    type: 'idr_tetrapolar',
    brand: 'General',
    width: 1,
    image: 'https://img.ltwebstatic.com/images3_pi/2022/05/26/165355653491410134444.jpg',
    defaultCurrent: 0
  }
];
