/** Saudação conforme a hora local: 5h–11h59 bom dia, 12h–17h59 boa tarde, demais boa noite. */
export function getGreeting(hour: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
