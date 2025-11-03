'use client';

import { THotlineCategory } from '@/interfaces/IHotlines';
import { cn } from '@/lib/utils';
import { Flame, Hospital, Landmark, LucideIcon, Phone, Siren } from 'lucide-react';

type HotlineCardProps = {
  type: THotlineCategory;
  name: string;
  number: string;
  location?: string;
  province?: string;
};

const HotlineCard: React.FC<HotlineCardProps> = ({ type, name, number, location, province }) => {
  // TODO: integrate alternate numbers

  const icons: Record<THotlineCategory, LucideIcon> = {
    police_hotlines: Siren,
    fire_hotlines: Flame,
    medical_hotlines: Hospital,
    government_hotlines: Landmark,
    utility_hotlines: Landmark,
  };

  const colors: Record<THotlineCategory, Record<string, string>> = {
    police_hotlines: {
      background: 'bg-primary-100',
      text: 'text-primary-500',
    },
    fire_hotlines: {
      background: 'bg-red-100',
      text: 'text-red-500',
    },
    medical_hotlines: {
      background: 'bg-green-100',
      text: 'text-green-500',
    },
    government_hotlines: {
      background: 'bg-gray-100',
      text: 'text-gray-500',
    },
    utility_hotlines: {
      background: 'bg-gray-100',
      text: 'text-gray-500',
    },
  };

  const Icon = icons[type];

  return (
    <a
      href={`tel:${number}`}
      className="flex flex-row border-gray-300 mx-4 border py-4 px-6 rounded-xl shadow-xs gap-4 bg-white"
    >
      <div>
        <div className={cn('rounded-xl', 'p-3', colors[type].background, colors[type].text)}>
          <Icon />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <div className="font-bold">{name}</div>
          <div className="flex flex-col gap-1">
            {location && (
              <div className="text-gray-700 text-xs text-neutral">
                {province ? `${location} (${province})` : location}
              </div>
            )}
            <div className="text-gray-800 text-sm">{number}</div>
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Phone size={14} />
              <span>Tap to call</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
};

export default HotlineCard;
