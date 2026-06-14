
import { QDCComponent } from '../types';

export const calculateTotalModules = (components: QDCComponent[]): number => {
  return components.reduce((acc, comp) => acc + comp.width, 0);
};

export const suggestBoardSize = (usedModules: number): number => {
  // Common Brazilian board sizes
  const sizes = [12, 18, 24, 36, 48, 72];
  
  // NBR 5410 Reserve calculation (approximate for the builder)
  let reserve = 2;
  if (usedModules > 6 && usedModules <= 12) reserve = 3;
  if (usedModules > 12 && usedModules <= 30) reserve = 4;
  if (usedModules > 30) reserve = Math.ceil(usedModules * 0.15);
  
  const totalNeeded = usedModules + reserve;
  
  return sizes.find(size => size >= totalNeeded) || sizes[sizes.length - 1];
};

export const calculatePhaseLoad = (components: QDCComponent[]) => {
  // Simple phase balancing logic
  // For a real app, we'd need to know which phase each circuit is connected to.
  // For now, let's just sum the currents.
  const totalAmps = components.reduce((acc, comp) => acc + comp.current, 0);
  return {
    totalAmps,
    isOverloaded: totalAmps > 100 // Example threshold for a standard residential connection
  };
};
