// Convierte un codigo ISO de pais (ej. "AR", "MX") al emoji de bandera
// correspondiente, combinando los indicadores regionales Unicode. No
// necesita imagenes: funciona con cualquier codigo de 2 letras.
export function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = [...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function countryLabel(country?: string | null, countryCode?: string | null): string {
  if (!country) return "Desconocido";
  return `${flagEmoji(countryCode)} ${country}`;
}
