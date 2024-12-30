import React, { useState, useEffect } from "react";
import axios from "axios";
import Select, { SingleValue, StylesConfig } from "react-select";

interface LocationOption {
  value: string; // Typically "lat,lon"
  label: string; // Display name
  lat: number;
  lon: number;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
}

// Define the props for the LocationInput component
interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
}

export function LocationInput({
  value,
  onChange,
  onCoordinatesChange,
}: LocationInputProps) {
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Debounce mechanism to limit API calls
  const [debouncedQuery, setDebouncedQuery] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      fetchLocations(debouncedQuery);
    } else {
      setOptions([]);
    }
  }, [debouncedQuery]);

  // Function to fetch locations from Nominatim API
  const fetchLocations = async (query: string) => {
    setIsLoading(true);
    setLocationError(null);

    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: 5,
        },
      });

      const formattedOptions: LocationOption[] = response.data.map((place: NominatimPlace) => ({
        value: `${place.lat},${place.lon}`,
        label: place.display_name,
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
      }));

      setOptions(formattedOptions);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocationError("Failed to fetch location suggestions.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch reverse geocoding results
  const fetchCurrentLocationName = async (lat: number, lon: number) => {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: {
          lat,
          lon,
          format: "json",
        },
      });

      return response.data.display_name;
    } catch (error) {
      console.error("Error fetching current location name:", error);
      return null;
    }
  };

  // Handle selection of an option
  const handleChange = (selectedOption: SingleValue<LocationOption>) => {
    if (selectedOption) {
      onChange(selectedOption.label);
      onCoordinatesChange?.(selectedOption.lat, selectedOption.lon);
    } else {
      onChange("");
      onCoordinatesChange?.(null, null);
    }
  };

  // Custom styles for react-select
  const customStyles: StylesConfig<LocationOption, false> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "#fff",
      borderColor: state.isFocused ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.2)",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : provided.boxShadow,
      "&:hover": {
        borderColor: "rgba(59, 130, 246, 0.5)",
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "rgba(59, 130, 246, 0.5)"
        : state.isFocused
        ? "rgba(59, 130, 246, 0.2)"
        : "transparent",
      color: "#fff",
      "&:active": {
        backgroundColor: "rgba(59, 130, 246, 0.5)",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#a1a1aa",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#fff",
    }),
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-400">Location</label>
      <div className="relative">
        <Select
          instanceId="location-select"
          value={options.find((option) => option.label === value) || null}
          onInputChange={(inputValue) => onChange(inputValue)}
          onChange={handleChange}
          options={options}
          isLoading={isLoading}
          placeholder="Search for a location"
          noOptionsMessage={() => "No locations found"}
          styles={customStyles}
          isClearable
          className="w-[80%] md:w-[90%]"
        />
        <button
          type="button"
          onClick={async () => {
            setIsLoading(true);
            setLocationError(null);
            try {
              if (!navigator.geolocation) {
                throw new Error("Geolocation is not supported by your browser");
              }

              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  resolve,
                  (error) => {
                    switch (error.code) {
                      case error.PERMISSION_DENIED:
                        reject(
                          new Error(
                            "Please allow location access in your browser settings"
                          )
                        );
                        break;
                      case error.POSITION_UNAVAILABLE:
                        reject(new Error("Location information is unavailable"));
                        break;
                      case error.TIMEOUT:
                        reject(new Error("Location request timed out"));
                        break;
                      default:
                        reject(new Error("An unknown error occurred"));
                    }
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                  }
                );
              });

              const { latitude, longitude } = position.coords;
              const locationName = await fetchCurrentLocationName(latitude, longitude);
              if (locationName) {
                onChange(locationName);
              } else {
                onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
              onCoordinatesChange?.(latitude, longitude);
            } catch (error) {
              console.error("Location error:", error);
              setLocationError(
                error instanceof Error ? error.message : "Unable to get your location"
              );
            } finally {
              setIsLoading(false);
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                     rounded-lg bg-sky-500/10 text-sky-400 
                     hover:bg-sky-500/20 transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          title="Get current location"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>
      </div>
      {locationError && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {locationError}
        </p>
      )}
    </div>
  );
}
