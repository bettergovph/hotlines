'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  AmbulanceIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  DropletIcon,
  LandmarkIcon,
  LucideIcon,
  Phone,
  PhoneIcon,
  SearchIcon,
} from 'lucide-react';

const HomeContent = () => {
  const [metadata, setMetadata] = useState<IMetadataResponse | null>();
  const [hotlines, setHotlines] = useState<IHotlinesResponse | null>();
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  const [filterOptions, setFilterOptions] = useState<{
    city: string;
    category: string;
  }>({
    city: '',
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

          // Find the city and its province in metadata (case-insensitive)
          const foundProvince = metadata.metadata.regions
            .flatMap(region => region.provinces)
            .find(province => province.cities.some(c => c.toLowerCase() === city.toLowerCase()));

          // Get the actual city name from metadata (preserves original casing)
          const actualCity = foundProvince?.cities.find(
            c => c.toLowerCase() === city.toLowerCase()
          );

          const foundCityValue =
            foundProvince && actualCity
              ? `${actualCity}|${foundProvince.province}`.toLowerCase()
              : null;

          console.log('Metadata:', metadata);
          console.log('City:', city);
          console.log('Found city value:', foundCityValue);

          if (foundCityValue) {
            localStorage.setItem('lastSavedLocation', foundCityValue);
            console.log('City:', city);
            console.log('Saved location!');

            setFilterOptions(prev => ({
              ...prev,
              city: foundCityValue,
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
              city: stored.toLowerCase(),
            }));
          }

          setIsDetectingLocation(false);
        }
      };

      getLocation();
    };

    detectLocation();

    // Set default city in city|province format (lowercase for consistency)
    const defaultCity = metadata.metadata.regions[0].provinces[0].cities[0];
    const defaultProvince = metadata.metadata.regions[0].provinces[0].province;
    setFilterOptions(prev => ({
      ...prev,
      city: `${defaultCity}|${defaultProvince}`.toLowerCase(),
    }));
  }, [metadata]);

  type LocationFilter = {
    province: string;
    city: string;
    key: string; // format: "city|province"
    displayName: string; // format: "city (province)"
  };

  // Build city list with province always appended
  const locationFilters: LocationFilter[] = useMemo(() => {
    if (!metadata) {
      return [];
    }
    return metadata.metadata.regions
      .flatMap(region => region.provinces)
      .flatMap(province =>
        province.cities.map(city => ({
          province: province.province,
          city,
          key: `${city}|${province.province}`.toLowerCase(),
          displayName: `${city} (${province.province})`,
        }))
      );
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

  const extractLocationFromFilter = (filterValue: string): { city: string; province?: string } => {
    if (filterValue.includes('|')) {
      const [city, province] = filterValue.split('|');
      return { city, province };
    }
    return { city: filterValue };
  };

  const locationFromFilter = extractLocationFromFilter(filterOptions.city);
  let selectedHotlines = hotlines.hotlines.filter(hotline => {
    if (locationFromFilter.province) {
      // Match both city and province (case-insensitive)
      return (
        hotline.city.toLowerCase() === locationFromFilter.city.toLowerCase() &&
        hotline.province.toLowerCase() === locationFromFilter.province.toLowerCase()
      );
    } else {
      // Legacy: match city only (for backward compatibility, case-insensitive)
      return hotline.city.toLowerCase() === locationFromFilter.city.toLowerCase();
    }
  });

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

  const sortedSelectedHotlines = selectedHotlines.sort((a, b) => {
    const categoryDiff = sort[a.category] - sort[b.category];
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return a.hotlineName.localeCompare(b.hotlineName, 'en', { sensitivity: 'base' });
  });

  return (
    <div className="flex flex-col bg-slate-50 min-h-[100vh] mx-auto items-center pb-40">
      {/* NAV/HEADER */}
      <div className="px-4 py-2 flex flex-row justify-start items-center gap-3 bg-white mb-4 w-full border-b border-gray-300">
        <Image height={200} width={200} src={logo2} alt="Logo" />
      </div>

      {/* FITERING OPTIONS */}
      <div className="flex flex-col gap-2 w-full px-3 pb-3 max-w-2xl">
        <Popover open={citySelectOpen} onOpenChange={setCitySelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              role="combobox"
              aria-expanded={citySelectOpen}
              className="w-full justify-between rounded-full"
            >
              {filterOptions.city !== ''
                ? locationFilters.find(
                    c => c.key.toLowerCase() === filterOptions.city.toLowerCase()
                  )?.displayName || locationFromFilter.city
                : 'Select City'}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search cities..." />
              <CommandList>
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup>
                  {locationFilters.map(cityData => (
                    <CommandItem
                      key={cityData.key}
                      value={cityData.displayName}
                      onSelect={() => {
                        setFilterOptions(prev => ({
                          ...prev,
                          city: cityData.key,
                        }));
                        setCitySelectOpen(false);
                        localStorage.setItem('lastSavedLocation', cityData.key);
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          'mr-2 h-4 w-4',
                          filterOptions.city.toLowerCase() === cityData.key.toLowerCase()
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {cityData.displayName}
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
              province={hotline.province}
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

            <p className="text-muted-foreground text-gray-500 mt-6">
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
