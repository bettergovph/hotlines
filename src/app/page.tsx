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
  XIcon,
} from 'lucide-react';

// Conditional logging utility for debugging (only in development)
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[HotlineApp]', ...args);
  }
};

// String normalization utility for consistent comparisons
const normalizeString = (str: string): string => str.toLowerCase().trim();

const HomeContent = () => {
  const [metadata, setMetadata] = useState<IMetadataResponse | null>();
  const [hotlines, setHotlines] = useState<IHotlinesResponse | null>();
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<{
    region: string;
    province: string;
    city: string;
    category: string;
  }>({
    region: '',
    province: '',
    city: '',
    category: 'All Hotlines', // default
  });

  const [regionSelectOpen, setRegionSelectOpen] = useState(false);
  const [provinceSelectOpen, setProvinceSelectOpen] = useState(false);
  const [citySelectOpen, setCitySelectOpen] = useState(false);

  // Helper function to update location filters and localStorage
  const updateLocation = (location: { region: string; province: string; city: string }) => {
    setFilterOptions(prev => ({ ...prev, ...location }));
    localStorage.setItem('lastSavedLocation', JSON.stringify(location));
  };

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
          if (!navigator.geolocation) {
            const error = new Error('Geolocation is not supported by your browser');
            setLocationError('Your browser does not support location detection');
            reject(error);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            error => {
              // Handle different geolocation errors with user-friendly messages
              let errorMessage = 'Could not detect your location';

              if (error.code === error.PERMISSION_DENIED) {
                errorMessage =
                  'Location access was denied. Enable location permissions to show hotlines for your current location.';
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage = 'Location information is unavailable.';
              } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Location request timed out.';
              }

              setLocationError(errorMessage);
              debugLog('Geolocation error:', error.code, error.message);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10_000,
            }
          );
        });
      };

      // Helper to get default location from metadata (first region -> province -> city)
      const getDefaultLocation = () => {
        const defaultRegion = metadata.metadata.regions[0].name;
        const defaultProvince = metadata.metadata.regions[0].provinces[0].province;
        const defaultCity = metadata.metadata.regions[0].provinces[0].cities[0];
        return {
          region: normalizeString(defaultRegion),
          province: normalizeString(defaultProvince),
          city: normalizeString(`${defaultCity}|${defaultProvince}`),
        };
      };

      // Helper to find location from metadata
      const findLocationInMetadata = (cityName: string) => {
        const normalizedCity = normalizeString(cityName);

        for (const region of metadata.metadata.regions) {
          for (const province of region.provinces) {
            const cityMatch = province.cities.find(c => normalizeString(c) === normalizedCity);

            if (cityMatch) {
              return {
                region: normalizeString(region.name),
                province: normalizeString(province.province),
                city: normalizeString(`${cityMatch}|${province.province}`),
              };
            }
          }
        }
        return null;
      };

      const getLocation = async () => {
        try {
          const location = await getCoords();
          const { longitude, latitude } = location.coords;
          debugLog('Geolocation coords:', { latitude, longitude });

          const response = await fetch(
            `/api/reverse-geocode?latitude=${latitude}&longitude=${longitude}`
          );

          if (!response.ok) {
            throw new Error('Failed to reverse geocode');
          }

          const data = await response.json();
          debugLog('Detected city:', data.city);

          const matchedLocation = findLocationInMetadata(data.city);

          if (matchedLocation) {
            debugLog('Location detected and matched:', matchedLocation);
            updateLocation(matchedLocation);
          } else {
            debugLog('City not found in metadata, using defaults');
            updateLocation(getDefaultLocation());
          }

          setIsDetectingLocation(false);
        } catch (err) {
          debugLog('Geolocation failed:', err);

          // Try to load from localStorage
          const stored = localStorage.getItem('lastSavedLocation');
          if (stored) {
            try {
              const locationData = JSON.parse(stored);
              debugLog('Loaded location from localStorage (new format):', locationData);
              setFilterOptions(prev => ({
                ...prev,
                region: locationData.region || '',
                province: locationData.province || '',
                city: locationData.city || '',
              }));
            } catch {
              debugLog('Loaded location from localStorage (legacy format):', stored);
              setFilterOptions(prev => ({ ...prev, city: normalizeString(stored) }));
            }
          } else {
            debugLog('No stored location, using defaults');
            updateLocation(getDefaultLocation());
          }

          setIsDetectingLocation(false);
        }
      };

      getLocation();
    };

    detectLocation();
  }, [metadata]);

  type RegionFilter = {
    name: string;
    key: string; // case-insensitive for matching
  };

  type ProvinceFilter = {
    name: string;
    regionName: string;
    key: string; // case-insensitive for matching
  };

  type LocationFilter = {
    region: string;
    province: string;
    city: string;
    key: string; // format: "city|province"
    displayName: string; // format: "city (province)"
  };

  // Build region list
  const regionFilters: RegionFilter[] = useMemo(() => {
    if (!metadata) {
      return [];
    }
    return metadata.metadata.regions.map(region => ({
      name: region.name,
      key: normalizeString(region.name),
    }));
  }, [metadata]);

  // Build province list - filter by region if selected, otherwise show all
  const provinceFilters: ProvinceFilter[] = useMemo(() => {
    if (!metadata) {
      return [];
    }

    const allProvinces = metadata.metadata.regions.flatMap(region =>
      region.provinces.map(province => ({
        name: province.province,
        regionName: region.name,
        key: normalizeString(province.province),
      }))
    );

    // Filter by selected region if one is selected
    if (filterOptions.region) {
      return allProvinces.filter(
        p => normalizeString(p.regionName) === normalizeString(filterOptions.region)
      );
    }

    return allProvinces;
  }, [metadata, filterOptions.region]);

  // Build city list - filter by province or region if selected, otherwise show all
  const locationFilters: LocationFilter[] = useMemo(() => {
    if (!metadata) {
      return [];
    }

    const allCities = metadata.metadata.regions
      .flatMap(region =>
        region.provinces.map(province => ({
          region: region.name,
          province: province.province,
          cities: province.cities,
        }))
      )
      .flatMap(data =>
        data.cities.map(city => ({
          region: data.region,
          province: data.province,
          city,
          key: normalizeString(`${city}|${data.province}`),
          displayName: `${city} (${data.province})`,
        }))
      );

    // Filter by selected province if one is selected
    if (filterOptions.province) {
      return allCities.filter(
        c => normalizeString(c.province) === normalizeString(filterOptions.province)
      );
    }

    // Filter by selected region if one is selected (but no province)
    if (filterOptions.region) {
      return allCities.filter(
        c => normalizeString(c.region) === normalizeString(filterOptions.region)
      );
    }

    return allCities;
  }, [metadata, filterOptions.region, filterOptions.province]);

  // Build lookup maps for efficient province→region and city→province mappings
  const provinceToRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!metadata) {
      return map;
    }

    metadata.metadata.regions.forEach(region => {
      region.provinces.forEach(province => {
        map.set(normalizeString(province.province), normalizeString(region.name));
      });
    });

    return map;
  }, [metadata]);

  const cityToLocationMap = useMemo(() => {
    const map = new Map<string, { region: string; province: string }>();
    if (!metadata) {
      return map;
    }

    metadata.metadata.regions.forEach(region => {
      region.provinces.forEach(province => {
        province.cities.forEach(city => {
          const cityKey = normalizeString(`${city}|${province.province}`);
          map.set(cityKey, {
            region: normalizeString(region.name),
            province: normalizeString(province.province),
          });
        });
      });
    });

    return map;
  }, [metadata]);

  const handleRegionChange = (regionKey: string) => {
    updateLocation({
      region: regionKey,
      province: '',
      city: '',
    });
    setRegionSelectOpen(false);
  };

  const handleProvinceChange = (provinceKey: string) => {
    const foundRegion = provinceToRegionMap.get(provinceKey) || '';

    updateLocation({
      region: foundRegion,
      province: provinceKey,
      city: '',
    });
    setProvinceSelectOpen(false);
  };

  const handleCityChange = (cityKey: string) => {
    const locationData = cityToLocationMap.get(cityKey);
    if (!locationData) {
      setCitySelectOpen(false);
      return;
    }

    updateLocation({
      region: locationData.region,
      province: locationData.province,
      city: cityKey,
    });
    setCitySelectOpen(false);
  };

  const handleClearRegion = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLocation({
      region: '',
      province: '',
      city: '',
    });
  };

  const handleClearProvince = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLocation({
      region: filterOptions.region,
      province: '',
      city: '',
    });
  };

  const handleClearCity = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLocation({
      region: filterOptions.region,
      province: filterOptions.province,
      city: '',
    });
  };

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

  // Apply hierarchical filtering: region -> province -> city
  let selectedHotlines = hotlines.hotlines.filter(hotline => {
    if (filterOptions.region) {
      if (normalizeString(hotline.regionName) !== normalizeString(filterOptions.region)) {
        return false;
      }
    }

    if (filterOptions.province) {
      if (normalizeString(hotline.province) !== normalizeString(filterOptions.province)) {
        return false;
      }
    }

    if (filterOptions.city) {
      const locationFromFilter = extractLocationFromFilter(filterOptions.city);
      if (locationFromFilter.province) {
        // Match both city and province (case-insensitive, trimmed)
        return (
          normalizeString(hotline.city) === normalizeString(locationFromFilter.city) &&
          normalizeString(hotline.province) === normalizeString(locationFromFilter.province)
        );
      } else {
        // Legacy: match city only (for backward compatibility, case-insensitive, trimmed)
        return normalizeString(hotline.city) === normalizeString(locationFromFilter.city);
      }
    }

    // If no location filter selected, show all hotlines
    return true;
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

      {/* LOCATION ERROR MESSAGE */}
      {locationError && (
        <div className="w-full max-w-2xl px-4 pb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <CircleAlertIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800">{locationError}</p>
              <p className="text-xs text-amber-700 mt-1">
                You can manually select your location below.
              </p>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="text-amber-600 hover:text-amber-800"
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* FILTERING OPTIONS */}
      <div className="flex flex-col sm:flex-row gap-3 w-full px-4 pb-3 max-w-2xl">
        {/* Region Selector */}
        <div className="flex-1 min-w-[140px]">
          <label className="text-sm font-semibold text-gray-800 mb-2 block ml-[5px]">Region</label>
          <Popover open={regionSelectOpen} onOpenChange={setRegionSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                role="combobox"
                aria-expanded={regionSelectOpen}
                className="w-full justify-between rounded-full h-9 text-xs"
              >
                <span className="truncate">
                  {filterOptions.region !== ''
                    ? regionFilters.find(r => r.key === filterOptions.region)?.name ||
                      'Select Region'
                    : 'Select Region'}
                </span>
                <div className="flex items-center ml-1 gap-0.5">
                  {filterOptions.region && (
                    <div
                      className="h-4 w-4 shrink-0 rounded-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={handleClearRegion}
                    >
                      <XIcon className="h-3 w-3 opacity-70" />
                    </div>
                  )}
                  <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search regions..." />
                <CommandList>
                  <CommandEmpty>No region found.</CommandEmpty>
                  <CommandGroup>
                    {regionFilters.map(regionData => (
                      <CommandItem
                        key={regionData.key}
                        value={regionData.name}
                        onSelect={() => handleRegionChange(regionData.key)}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            filterOptions.region === regionData.key ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {regionData.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Province Selector */}
        <div className="flex-1 min-w-[140px]">
          <label className="text-sm font-semibold text-gray-800 mb-2 block ml-[5px]">
            Province
          </label>
          <Popover open={provinceSelectOpen} onOpenChange={setProvinceSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                role="combobox"
                aria-expanded={provinceSelectOpen}
                className="w-full justify-between rounded-full h-9 text-xs"
              >
                <span className="truncate">
                  {filterOptions.province !== ''
                    ? provinceFilters.find(p => p.key === filterOptions.province)?.name ||
                      'Select Province'
                    : 'Select Province'}
                </span>
                <div className="flex items-center ml-1 gap-0.5">
                  {filterOptions.province && (
                    <div
                      className="h-4 w-4 shrink-0 rounded-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={handleClearProvince}
                    >
                      <XIcon className="h-3 w-3 opacity-70" />
                    </div>
                  )}
                  <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search provinces..." />
                <CommandList>
                  <CommandEmpty>No province found.</CommandEmpty>
                  <CommandGroup>
                    {provinceFilters.map(provinceData => (
                      <CommandItem
                        key={provinceData.key}
                        value={provinceData.name}
                        onSelect={() => handleProvinceChange(provinceData.key)}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            filterOptions.province === provinceData.key
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        {provinceData.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* City Selector */}
        <div className="flex-1 min-w-[140px]">
          <label className="text-sm font-semibold text-gray-800 mb-2 block ml-[5px]">City</label>
          <Popover open={citySelectOpen} onOpenChange={setCitySelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                role="combobox"
                aria-expanded={citySelectOpen}
                className="w-full justify-between rounded-full h-9 text-xs"
              >
                <span className="truncate">
                  {filterOptions.city !== ''
                    ? locationFilters.find(c => c.key === normalizeString(filterOptions.city))
                        ?.displayName || 'Select City'
                    : 'Select City'}
                </span>
                <div className="flex items-center ml-1 gap-0.5">
                  {filterOptions.city && (
                    <div
                      className="h-4 w-4 shrink-0 rounded-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={handleClearCity}
                    >
                      <XIcon className="h-3 w-3 opacity-70" />
                    </div>
                  )}
                  <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search cities or municipalities..." />
                <CommandList>
                  <CommandEmpty>No city found.</CommandEmpty>
                  <CommandGroup>
                    {locationFilters.map(cityData => (
                      <CommandItem
                        key={cityData.key}
                        value={cityData.displayName}
                        onSelect={() => handleCityChange(cityData.key)}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            normalizeString(filterOptions.city) === cityData.key
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
      </div>

      {/* LOCATION SCOPE INDICATOR */}
      {!filterOptions.region && !filterOptions.province && !filterOptions.city && (
        <div className="w-full max-w-2xl px-4 pb-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800">
              Showing{' '}
              <span className="font-semibold">{sortedSelectedHotlines.length} hotlines</span> from{' '}
              <span className="font-semibold">all locations nationwide</span>. Select a location
              above to filter.
            </p>
          </div>
        </div>
      )}

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
              alternateNumbers={hotline.alternateNumbers}
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

            <p className="text-gray-500 mt-6">
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
