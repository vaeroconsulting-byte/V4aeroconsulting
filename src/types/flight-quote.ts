export type TripType = "one-way" | "round-trip";

export interface FlightQuoteRequest {
  origin: string;
  destination: string;
  passengers: number;
  tripType: TripType;
  departureDate: string;
  departureTime: string;
  returnDate?: string;
  returnTime?: string;
}
