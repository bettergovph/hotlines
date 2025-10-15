'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import logo2 from '/public/bettergov-horizontal-logo.png';

import Image from 'next/image';
import HotlineCard from '@/components/hotline-card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { IMetadataResponse } from '@/interfaces/IMetadata';
import { IHotlinesResponse, THotlineCategory } from '@/interfaces/IHotlines';

import { Button } from '@/components/ui/button';
import { LucideIcon, Phone } from 'lucide-react';
import { ChevronsUpDownIcon } from 'lucide-react';
import { CheckIcon } from 'lucide-react';
import { PhoneIcon } from 'lucide-react';
import { CircleAlertIcon } from 'lucide-react';
import { AmbulanceIcon } from 'lucide-react';
import { DropletIcon } from 'lucide-react';
import { LandmarkIcon } from 'lucide-react';
import { SearchIcon } from 'lucide-react';

const HomeContent = () => {
  const [metadata, setMetadata] = useState<IMetadataResponse | null>();
  const [hotlines, setHotlines] = useState<IHotlinesResponse | null>();
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  const [filterOptions, setFilterOptions] = useState<{
    city: string;
    region?: string;
    category: string;
  }>({
    city: '',
    region: undefined,
    category: 'All Hotlines', // default
  });

  const [citySelectOpen, setCitySelectOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metadataRes = await fetch('/data/metadata.json');
        const metadata = await metadataRes.json();
        setMetadata(metadata);

        const hotlinesRes = await fetch('/data/hotlines.json');
        const hotlines = await hotlinesRes.json();
        setHotlines(hotlines);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Initialize service worker for PWA functionality
    if (process.env.NODE_ENV === 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!metadata) {
      return;
    }

    const detectLocation = () => {
      const getCoords = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            error => {
              console.error('Geolocation error:', error);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
            }
          );
        });
      };

      const getLocation = async () => {
        try {
          const location = await getCoords();
          const { longitude, latitude } = location.coords;

          console.log('Coords:', { latitude, longitude });

          const response = await fetch(
            `/api/reverse-geocode?latitude=${latitude}&longitude=${longitude}`
          );

          if (!response.ok) {
            throw new Error('Failed to reverse geocode');
          }

          const data = await response.json();
          const city = data.city;

          // Check if the detected city exists
          // If it does, set it as a filtering option
          const cityExists = metadata?.metadata.regions.some(region =>
            region.provinces.some(province => province.cities.includes(city))
          );

          console.log('Metadata:', metadata);
          console.log('City:', city);
          console.log('City exists:', cityExists);

          if (cityExists) {
            localStorage.setItem('lastSavedLocation', city);
            console.log('City:', city);
            console.log('Saved location!');

            setFilterOptions(prev => ({
              ...prev,
              city: city,
            }));
          }

          setIsDetectingLocation(false);
        } catch (err) {
          console.error('Error detecting location:', err);

          // Offline/denied
          const stored = localStorage.getItem('lastSavedLocation');
          if (stored) {
            setFilterOptions(prev => ({
              ...prev,
              city: stored,
            }));
          }

          setIsDetectingLocation(false);
        }
      };

      getLocation();
    };

    detectLocation();

    setFilterOptions(prev => ({
      ...prev,
      city: metadata.metadata.regions[0].provinces[0].cities[0],
    }));
  }, [metadata]);

  if (!hotlines || !metadata || isDetectingLocation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-blue-900 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  let selectedHotlines = hotlines.hotlines.filter(hotline => hotline.city === filterOptions.city);

  const hotlineTypeMap: Record<string, THotlineCategory[]> = {
    'Emergency Hotlines': ['police_hotlines', 'fire_hotlines'],
    'Medical Hotlines': ['medical_hotlines'],
    'Government Hotlines': ['government_hotlines'],
    'Utility Hotlines': ['utility_hotlines'],
  };

  if (
    filterOptions !== null &&
    filterOptions.category !== null &&
    filterOptions.category !== 'All Hotlines'
  ) {
    selectedHotlines = selectedHotlines.filter(hotline =>
      hotlineTypeMap[filterOptions.category].includes(hotline.category)
    );
  }

  const sort: Record<THotlineCategory, number> = {
    police_hotlines: 0,
    medical_hotlines: 1,
    fire_hotlines: 2,
    government_hotlines: 3,
    utility_hotlines: 4,
  };

  const sortedSelectedHotlines = selectedHotlines.sort(
    (a, b) => sort[a.category] - sort[b.category]
  );

  // Compute cities to show in the city selector based on selected region
  const citiesToShow: string[] = filterOptions.region
    ? (metadata.metadata.regions
        .find(r => r.name === filterOptions.region)
        ?.provinces.flatMap(p => p.cities) ?? [])
    : metadata.metadata.regions.flatMap(r => r.provinces.flatMap(p => p.cities));

  return (
    <div className="flex flex-col bg-slate-50 min-h-[100vh] mx-auto items-center pb-40">
      {/* NAV/HEADER */}
      <div className="px-4 py-2 flex flex-row justify-start items-center gap-3 bg-white mb-4 w-full border-b border-gray-300">
        <Image height={200} width={200} src={logo2} alt="Logo" />
      </div>

      {/* FITERING OPTIONS */}
      <div className="flex flex-col gap-2 w-full px-3 pb-3 max-w-2xl">
        {/* Filter by City */}
        <Popover open={citySelectOpen} onOpenChange={setCitySelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              role="combobox"
              aria-expanded={citySelectOpen}
              className="w-full justify-between rounded-full"
            >
              {filterOptions.city !== '' ? filterOptions.city : 'Select City'}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search cities..." />
              <CommandList>
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup>
                  {citiesToShow.map(city => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={currentValue => {
                        setFilterOptions(prev => ({
                          ...prev,
                          city: currentValue,
                        }));
                        setCitySelectOpen(false);
                        localStorage.setItem('lastSavedLocation', currentValue);
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          'mr-2 h-4 w-4',
                          filterOptions.city === city ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filter by Region */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between rounded-full mt-2"
            >
              {filterOptions.region ? filterOptions.region : 'Select Region'}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search regions..." />
              <CommandList>
                <CommandEmpty>No region found.</CommandEmpty>
                <CommandGroup>
                  {metadata.metadata.regions.map(region => (
                    <CommandItem
                      key={region.name}
                      value={region.name}
                      onSelect={currentValue => {
                        setFilterOptions(prev => ({
                          ...prev,
                          region: currentValue,
                          city: '', // Reset city when region changes
                        }));
                        localStorage.setItem('lastSavedRegion', currentValue);
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          'mr-2 h-4 w-4',
                          filterOptions.region === region.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {region.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col justify-center items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <div className="flex w-full flex-row gap-2 pb-3 px-4 md:justify-center">
          {['All Hotlines', 'Emergency', 'Medical', 'Government', 'Utility'].map(
            (hotlineType, index) => {
              const hotlineCategoryMap: Record<string, string> = {
                'All Hotlines': 'All Hotlines',
                Emergency: 'Emergency Hotlines',
                Medical: 'Medical Hotlines',
                Government: 'Government Hotlines',
                Utility: 'Utility Hotlines',
              };

              const icons: Record<string, LucideIcon> = {
                'All Hotlines': PhoneIcon,
                Emergency: CircleAlertIcon,
                Medical: AmbulanceIcon,
                Utility: DropletIcon,
                Government: LandmarkIcon,
              };

              const Icon = icons[hotlineType];

              return (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  role="combobox"
                  aria-expanded={citySelectOpen}
                  className={`${(filterOptions.category === hotlineCategoryMap[hotlineType] || filterOptions.category === hotlineType) && 'bg-primary-500 text-white'} justify-between rounded-full hover:bg-primary-500 hover:text-white`}
                  onClick={() =>
                    setFilterOptions(prev => ({
                      ...prev,
                      category: hotlineCategoryMap[hotlineType] || 'all_hotlines',
                    }))
                  }
                >
                  <Icon className="mr-1 h-4 w-4 shrink-0" />
                  {hotlineType}
                </Button>
              );
            }
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl w-full">
        {/* MAIN HOTLINE CARD */}
        <a
          href="tel:911"
          className="bg-gradient-to-br from-primary-400 to-primary-600 mx-4 p-6 rounded-2xl flex flex-col gap-1 shadow-lg"
        >
          <div className="text-white font-bold text-6xl">911</div>
          <div className="flex flex-row justify-between items-center">
            <div className="text-white text-lg">National Emergency hotline</div>
            <Button
              variant="default"
              className="rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              size="lg"
              onClick={() => (window.location.href = 'tel:911')}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </a>

        {sortedSelectedHotlines.length > 0 ? (
          sortedSelectedHotlines.map((hotline, index) => (
            <HotlineCard
              key={index}
              type={hotline.category}
              name={hotline.hotlineName}
              number={hotline.hotlineNumber}
              location={hotline.city}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-5 text-center text-sm">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <Phone className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <SearchIcon className="w-4 h-4 text-white" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Hotlines Found</h3>

            <p className="text-muted-foreground mb-6 max-w-sm">
              We couldn't find any emergency hotlines matching your current filters. Try adjusting
              your search criteria or explore other locations.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="gap-2 px-6 py-2.5 border border-gray-300 text-muted-foreground rounded-lg font-medium hover:bg-gray-50 transition-colors"
                onClick={() => setFilterOptions(prev => ({ ...prev, category: 'All Hotlines' }))}
              >
                View All Hotlines
              </button>
            </div>

            <p className="text-muted-foreground mt-6">
              Need immediate assistance? Call{' '}
              <span className="font-semibold text-gray-700">911</span> for emergencies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeContent;
