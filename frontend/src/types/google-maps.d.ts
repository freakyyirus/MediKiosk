interface Window {
  google?: {
    maps?: {
      places?: {
        PlacesService: new (container: HTMLElement) => GooglePlacesService;
        PlacesServiceStatus: {
          OK: string;
        };
      };
    };
  };
}

interface GooglePlacesResult {
  place_id?: string;
  name?: string;
  vicinity?: string;
}

interface GooglePlacesService {
  nearbySearch(
    request: {
      location: { lat: number; lng: number };
      radius: number;
      type: string;
    },
    callback: (results: GooglePlacesResult[] | null, status: string) => void,
  ): void;
}