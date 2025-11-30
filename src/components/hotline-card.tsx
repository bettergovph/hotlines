'use client';

import { THotlineCategory } from '@/interfaces/IHotlines';
import { cn } from '@/lib/utils';
import { Flame, Hospital, Landmark, LucideIcon, Phone, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

type HotlineCardProps = {
  type: THotlineCategory;
  name: string;
  number: string;
  location?: string;
  province?: string;
  lastVerified?: string;
  alternateNumbers: string[];
};

const HotlineCard: React.FC<HotlineCardProps> = ({
  type,
  name,
  number,
  location,
  province,
  lastVerified,
  alternateNumbers,
}) => {
  const [isAltNumModalOpen, setIsAltNumModalOpen] = useState(false);

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

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
    setIsAltNumModalOpen(false);
  };

  return (
    <div className="flex flex-row border-gray-300 mx-4 border py-4 px-6 rounded-xl shadow-xs gap-4 bg-white">
      <div>
        <div className={cn('rounded-xl', 'p-3', colors[type].background, colors[type].text)}>
          <Icon />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <div className="font-bold">{name}</div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-4">
              {location && (
                <div className="text-gray-700 text-xs text-neutral">
                  {province ? `${location} (${province})` : location}
                </div>
              )}
              {lastVerified && (
                <div className="text-gray-700 text-xs text-neutral">
                  Last Verified: {new Date(lastVerified).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => handleCall(number)}
                variant="default"
                size="sm"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Phone size={16} />
                <span>{number}</span>
              </Button>

              {alternateNumbers && alternateNumbers.length > 0 && (
                <Dialog open={isAltNumModalOpen} onOpenChange={setIsAltNumModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      Call alternate number
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select a number to call</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                      {alternateNumbers.map((altNumber, index) => (
                        <Button
                          key={index}
                          onClick={() => handleCall(altNumber)}
                          variant="outline"
                          className="flex items-center gap-3 text-blue-600 text-base justify-start h-auto py-3"
                        >
                          <Phone size={16} />
                          <span>{altNumber}</span>
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotlineCard;
