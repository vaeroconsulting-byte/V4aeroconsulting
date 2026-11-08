import { formatLocalDate } from "@/lib/dates";
import type { FlightQuoteRequest } from "@/types/flight-quote";

export const WHATSAPP_PHONE = "55981476175";

function formatTime(value: string): string {
  return value.replace(":", "h");
}

export function buildFlightQuoteMessage(request: FlightQuoteRequest): string {
  const lines = [
    "SOLICITAÇÃO DE COTAÇÃO | V4 AERO CONSULTING",
    "",
    "IDENTIFICAÇÃO DO SOLICITANTE",
    `Nome: ${request.requesterName}`,
    `Empresa: ${request.organization || "Não informado"}`,
    `Telefone: ${request.phone}`,
    `E-mail: ${request.email || "Não informado"}`,
    "",
    "INFORMAÇÕES DO VOO",
    `Origem: ${request.origin}`,
    `Destino: ${request.destination}`,
    `Tipo de viagem: ${
      request.tripType === "round-trip" ? "Ida e volta" : "Somente ida"
    }`,
    `Passageiros: ${request.passengers}`,
    "",
    "PARTIDA",
    `Data: ${formatLocalDate(request.departureDate)}`,
    `Horário: ${formatTime(request.departureTime)}`,
  ];

  if (
    request.tripType === "round-trip" &&
    request.returnDate &&
    request.returnTime
  ) {
    lines.push(
      "",
      "RETORNO",
      `Data: ${formatLocalDate(request.returnDate)}`,
      `Horário: ${formatTime(request.returnTime)}`,
    );
  }

  lines.push(
    "",
    `Observações: ${request.observations || "Não informado"}`,
    "",
    "Solicito uma cotação para o itinerário informado.",
  );

  return lines.join("\n");
}

export function createWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_CONTACT_URL = createWhatsAppUrl(
  "Olá! Gostaria de solicitar informações sobre um voo.",
);
