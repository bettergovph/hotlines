# [Philippines Emergency Hotlines](https://github.com/bettergovph/hotlines)

A progressive web application (PWA) for quick access to emergency hotlines across the Philippines.
Users can search by region, province, city, and hotline type (police, fire, medical, government, etc.), and instantly get the right numbers for their area.

Built with Next.js 15 (App Router), TypeScript, and React.

## Features

- 🔍 Filter emergency hotlines by City/Municipality
- 📞 Filter by hotline type (Emergency, Medical, Police, Government, etc.)
- ⚡ Real-time data fetching from structured JSON data sources
- 🎨 Modern responsive UI with TailwindCSS + shadcn/ui
- ⏳ Loading skeletons for a smooth UX
- 📱 Mobile-friendly design
- 🌐 Progressive Web App (PWA) capabilities:
  - Offline access to hotline data
  - Installable on mobile devices
  - Fast loading with service worker caching
  - Responsive across all device sizes

## Data Structure

The application uses two primary JSON files for data management:

### metadata.json

- Provides the hierarchical structure of locations (Region → Province → City)
- Lists available hotline types and categories
- Tracks total number of hotlines
- Maintains last update timestamp
- Makes contribution easier by providing a clear data structure

### hotlines.json

- Contains the comprehensive hotline data
- Each entry includes:
  - Unique ID
  - Location information (region, province, city)
  - Contact details with alternate numbers
  - Service categorization
  - Availability information
  - Active status tracking

### JSON Schema Integration

JSON schemas are available in the `schemas/` directory to provide IDE support with autocomplete, validation, and inline error detection when editing data files.

#### VS Code Setup

Add schema to Workspace Settings in `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["public/data/hotlines.json"],
      "url": "./schemas/hotlines.schema.json"
    },
    {
      "fileMatch": ["public/data/metadata.json"],
      "url": "./schemas/metadata.schema.json"
    }
  ]
}
```

#### JetBrains IDEs Setup (WebStorm, IntelliJ IDEA)

1. Open **Preferences/Settings** → **Languages & Frameworks** → **Schemas and DTDs** → **JSON Schema Mappings**
2. Click the **+** button to add a new mapping
3. For **hotlines.json**:
   - Name: `Hotlines Schema`
   - Schema file or URL: Browse to `schemas/hotlines.schema.json`
   - Schema version: `JSON Schema version 7`
   - Add file path pattern: `public/data/hotlines.json`
4. Repeat for **metadata.json**:
   - Name: `Hotlines Metadata Schema`
   - Schema file or URL: Browse to `schemas/metadata.schema.json`
   - Schema version: `JSON Schema version 7`
   - Add file path pattern: `public/data/metadata.json`

## Tech Stack

- Next.js 15 (App Router)
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Serwist (PWA implementation)

## Offline Functionality

The app implements a robust offline-first approach:

1. Service Worker caching for:
   - Core application assets
   - Hotline and metadata JSON files
   - Images and static resources
2. Stale-while-revalidate strategy for fresh content
3. Offline fallback page
4. Persistent data storage

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/bettergovph/hotlines.git
cd hotlines-bettergov
```

2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server

```bash
npm run dev
```

## Contributing

Contributions are welcome! The data structure makes it easy to add or update hotline information:

1. Fork the repo
2. Update the relevant JSON files:
   - Add new hotlines to `hotlines.json`
   - Update metadata in `metadata.json` if adding new regions/provinces/cities
3. Create a new branch (feature/awesome-thing)
4. Commit changes
5. Open a Pull Request

## Contributors

<a href="https://github.com/bettergovph/hotlines/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bettergovph/hotlines" />
</a>

## BetterGov

Part of the #BetterGovMovement initiative to make government services more accessible through technology.
