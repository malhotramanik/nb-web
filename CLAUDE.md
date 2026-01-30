# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoBroker Property Search - a simple web application for searching rental properties in Bangalore (PLaY Arena & Harlur Road area). It fetches property listings from NoBroker's API and displays them with client-side filtering.

## Architecture

**Backend (`server.js`):**
- Node.js HTTP server on port 8080 (no external dependencies)
- `/api/refresh` - Fetches 3 pages from NoBroker API, deduplicates properties, saves to `output.json`
- Serves static files from the same directory

**Frontend (`index.html`):**
- Single HTML file with embedded CSS and JavaScript
- Loads property data from `output.json` on page load
- Client-side filters: property age, gym, floor level, gated security, property title keywords
- Base64-encoded `searchParam` contains location coordinates for NoBroker API

**Keywords (`keywords.json`):**
- Stores `propertyTitleKeywords` array for filtering properties by society/title name
- Managed via `/api/keywords` endpoints (GET/POST)
- Keywords are case-insensitive and match if any keyword is found in property title

**Data Flow:**
1. User clicks "Refresh Data" → calls `/api/refresh`
2. Server fetches 3 pages from NoBroker API → deduplicates → saves `output.json`
3. Frontend reads `output.json` → applies filters → renders property cards

## Commands

```bash
# Start the server
node server.js

# Server runs at http://localhost:8080
```

## NoBroker API

The `searchParam` is a Base64-encoded JSON array of locations:
```json
[{"lat":12.911395,"lon":77.6762991,"placeId":"...","placeName":"PLaY Arena"},...]
```

Default search parameters:
- City: Bangalore
- Rent: ₹30,000 - ₹55,000
- Type: 2 BHK, 3 BHK
- Radius: 2.5 km
