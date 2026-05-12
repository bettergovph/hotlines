'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import logo2 from '/public/bettergov-horizontal-logo.png';
import { FileQuestion, Home, MapPin, Search, X } from 'lucide-react';

// Type definitions based on your metadata.json
type LocationData = {
  city: string;
  province: string;
  displayName: string;
};

export default function NotFound() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch metadata only when the modal is opened for the first time
  useEffect(() => {
    if (isModalOpen && !metadata) {
      setIsLoading(true);
      fetch('/data/metadata.json')
        .then(res => res.json())
        .then(data => {
          setMetadata(data.metadata);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load locations', err);
          setIsLoading(false);
        });
    }
  }, [isModalOpen, metadata]);

  // Flatten the nested JSON into a simple searchable list
  const locationList: LocationData[] = useMemo(() => {
    if (!metadata) {
      return [];
    }
    return metadata.regions.flatMap((region: any) =>
      region.provinces.flatMap((province: any) =>
        province.cities.map((city: string) => ({
          city,
          province: province.province,
          displayName: `${city} (${province.province})`,
        }))
      )
    );
  }, [metadata]);

  // Filter locations based on user input
  const filteredLocations = locationList.filter(loc =>
    loc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (loc: LocationData) => {
    setIsModalOpen(false);
    // Navigate to home with the selected city and province as query parameters
    router.push(
      `/?city=${encodeURIComponent(loc.city.toLowerCase())}&province=${encodeURIComponent(loc.province.toLowerCase())}`
    );
  };

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen mx-auto items-center relative">
      {/* NAV/HEADER */}
      <div className="px-4 py-2 flex flex-row justify-start items-center gap-3 bg-white mb-4 w-full border-b border-gray-300">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Image height={200} width={200} src={logo2} alt="Logo" />
        </Link>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 text-center max-w-md w-full pb-32">
        {/* 404 Graphic */}
        <div className="relative mb-8">
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
            <FileQuestion className="w-14 h-14 text-blue-400" strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-4 border-slate-50">
            <span className="text-white font-bold text-sm tracking-wider">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">Page Not Found</h1>

        <p className="text-gray-500 mb-8 leading-relaxed">
          We couldn't find the page you're looking for. It might have been moved, deleted, or
          perhaps the link is broken.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Home className="w-5 h-5" />
            Return Home
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto cursor-pointer"
          >
            <Search className="w-5 h-5" />
            Find Hotlines
          </button>
        </div>
      </div>

      {/* LOCATION PICKER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Select Location</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search city or province..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* List container */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : filteredLocations.length > 0 ? (
                <div className="space-y-1">
                  {filteredLocations.map(loc => (
                    <button
                      key={`${loc.city}-${loc.province}`}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                    >
                      <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-gray-500">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{loc.city}</p>
                        <p className="text-xs text-gray-500">{loc.province}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4 text-gray-500 text-sm">
                  No locations found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
