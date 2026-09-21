export interface MachineItem {
  id: string;
  name: string;
  modelCode: string;
  category: string;
  capacity: string;
  price: number; // in INR
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export const DEFAULT_MACHINES: MachineItem[] = [
  {
    id: 'mach-1',
    name: 'Automatic Murukku Machine (Standard)',
    modelCode: 'SLI-AMM-500',
    category: 'Murukku Machinery',
    capacity: '50 - 100 Kg/Day',
    price: 225000,
    description: 'Fully automatic single/multi-die extruder with automatic oil drop & frying sync.',
    isActive: true,
  },
  {
    id: 'mach-2',
    name: 'Semi-Automatic Murukku Machine',
    modelCode: 'SLI-SAM-250',
    category: 'Murukku Machinery',
    capacity: '25 - 50 Kg/Day',
    price: 145000,
    description: 'Compact semi-automatic machine ideal for startup businesses and small bakeries.',
    isActive: true,
  },
  {
    id: 'mach-3',
    name: 'Heavy Duty Industrial Murukku Extruder',
    modelCode: 'SLI-HDM-1000',
    category: 'Murukku Machinery',
    capacity: '150 - 300 Kg/Day',
    price: 380000,
    description: 'High capacity continuous industrial extruder for commercial snacks manufacturers.',
    isActive: true,
  },
  {
    id: 'mach-4',
    name: 'Ring Murukku / Chegodilu Machine',
    modelCode: 'SLI-RMM-300',
    category: 'Murukku Machinery',
    capacity: '40 - 80 Kg/Day',
    price: 195000,
    description: 'Specialized round ring shaping and cutting machine for Ring Murukku / Chegodilu.',
    isActive: true,
  },
  {
    id: 'mach-5',
    name: 'Ribbon Pakoda & Sev Extrusion Line',
    modelCode: 'SLI-RPM-400',
    category: 'Snacks & Savories',
    capacity: '60 - 120 Kg/Day',
    price: 210000,
    description: 'Interchangeable dies for Ribbon Pakoda, Kara Sev, Omapodi, and Mixture strands.',
    isActive: true,
  },
  {
    id: 'mach-6',
    name: 'Commercial Namkeen / Mixture Mixer & Fryer',
    modelCode: 'SLI-NMM-600',
    category: 'Snacks & Savories',
    capacity: '100 - 200 Kg/Day',
    price: 275000,
    description: 'Complete mixing, frying, and de-oiling setup for south Indian mixture.',
    isActive: true,
  },
  {
    id: 'mach-7',
    name: 'Chips Slicing, De-oiling & Frying Machine',
    modelCode: 'SLI-CSU-350',
    category: 'Chips & Fries',
    capacity: '50 - 100 Kg/Day',
    price: 185000,
    description: 'High speed adjustable slicing unit for Banana, Potato, and Cassava chips.',
    isActive: true,
  },
  {
    id: 'mach-8',
    name: 'Wire Nail Making Machine',
    modelCode: 'SLI-WNM-800',
    category: 'Industrial Machinery',
    capacity: '300 - 500 Pcs/Min',
    price: 350000,
    description: 'Heavy duty high-precision wire nail manufacturing machine.',
    isActive: true,
  },
  {
    id: 'mach-9',
    name: 'High Speed Paper Cup Making Machine',
    modelCode: 'SLI-PCM-70',
    category: 'Packaging Machinery',
    capacity: '70 - 85 Pcs/Min',
    price: 550000,
    description: 'Single/Double PE coated paper cup forming machine with ultrasonic sealing.',
    isActive: true,
  },
  {
    id: 'mach-10',
    name: 'Automatic Camphor Tablet Making Machine',
    modelCode: 'SLI-CTM-120',
    category: 'Tablet Machinery',
    capacity: '120 - 150 Pcs/Min',
    price: 165000,
    description: 'High pressure automatic pressing for square and round camphor tablets.',
    isActive: true,
  },
  {
    id: 'mach-11',
    name: 'Automatic Agarbatti / Incense Stick Machine',
    modelCode: 'SLI-AIM-200',
    category: 'Stick Machinery',
    capacity: '180 - 220 Pcs/Min',
    price: 125000,
    description: 'Automatic feeder and high speed stick extrusion coating machine.',
    isActive: true,
  },
];

export const MACHINE_CATEGORIES = [
  'All Categories',
  'Murukku Machinery',
  'Snacks & Savories',
  'Chips & Fries',
  'Industrial Machinery',
  'Packaging Machinery',
  'Tablet Machinery',
  'Stick Machinery',
  'Custom Machines',
];

export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
