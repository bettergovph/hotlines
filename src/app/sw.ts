import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, StaleWhileRevalidate } from 'serwist';
import precacheManifest from '../../precache-manifest.json';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new StaleWhileRevalidate({ cacheName: 'images' }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addToPrecacheList([
  { url: '/data/metadata.json', revision: precacheManifest['/data/metadata.json'] },
  { url: '/data/hotlines.json', revision: precacheManifest['/data/hotlines.json'] },
  {
    url: '/bettergov-horizontal-logo.png',
    revision: precacheManifest['/bettergov-horizontal-logo.png'],
  },
]);

serwist.addEventListeners();
