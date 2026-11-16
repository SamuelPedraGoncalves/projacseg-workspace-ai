/**
 * Abertura de um negócio dentro do CRM.
 *
 * Futuro: dentro do Bitrix24 (app embutido), usar a BX24 JS SDK para abrir o slider do negócio;
 * fora dele, abrir a URL do portal resolvida pelo backend. Nenhum domínio de portal ou ID fica
 * fixo no frontend.
 */
export interface CrmNavigator {
  isAvailable(): boolean;
  openDeal(dealId: string): void;
}

/** Implementação da demonstração: não há CRM conectado. */
export class DisconnectedCrmNavigator implements CrmNavigator {
  isAvailable(): boolean {
    return false;
  }

  openDeal(): void {
    // Sem integração nesta etapa.
  }
}

export const crmNavigator: CrmNavigator = new DisconnectedCrmNavigator();
