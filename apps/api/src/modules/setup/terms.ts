import type { TermsDocument } from "@projacseg/shared";
import type { Store, TenantRecord } from "../../store/types";

/**
 * Termos de uso, privacidade e LGPD. **Versão provisória**: o texto definitivo é da TechStone e
 * precisa substituir este antes de qualquer corretora fora do piloto. Trocar o texto exige trocar a
 * versão; a corretora então aceita de novo.
 */
export const CURRENT_TERMS: TermsDocument = {
  version: "2026-11-19-provisorio",
  provisional: true,
  title: "Termos de uso, privacidade e LGPD — versão provisória",
  body: [
    "Esta é uma versão provisória dos termos do WorkSeg AI, usada só durante os testes. Ela será substituída pela versão definitiva da TechStone, e a corretora precisará aceitá-la de novo.",
    "O WorkSeg AI é um aplicativo para o Bitrix24 da corretora. Para organizar o trabalho do time comercial, ele lê dados do CRM do Bitrix24 da corretora (negócios, etapas, responsáveis, campos configurados e a estrutura da empresa) e os usa para mostrar painéis, gerar lembretes e avisar supervisores.",
    "Algumas funções usam inteligência artificial de um fornecedor terceiro, a Anthropic: traduzir as regras escritas pela corretora e responder no chat do assistente. Para isso, trechos dos dados necessários àquela tarefa são enviados ao fornecedor. Nomes de clientes são substituídos por identificadores antes do envio sempre que a tarefa permite.",
    "A corretora é a controladora dos dados pessoais tratados no seu Bitrix24; a TechStone atua como operadora, só para prestar o serviço. A TechStone não vende esses dados nem os usa para treinar modelos de inteligência artificial.",
    "Ao aceitar, o administrador declara ter poderes para contratar em nome da corretora e autoriza o tratamento descrito acima, inclusive o uso da inteligência artificial.",
    "Contato da TechStone para dúvidas e para os direitos dos titulares previstos na LGPD: [a preencher pela TechStone]. Razão social, CNPJ e encarregado de dados: [a preencher pela TechStone].",
  ].join("\n\n"),
};

/** Aviso curto mostrado uma vez a cada usuário que não é administrador. */
export const PRIVACY_NOTICE: TermsDocument = {
  version: "2026-11-19-aviso-provisorio",
  provisional: true,
  title: "Como o WorkSeg AI usa os seus dados",
  body: [
    "O WorkSeg AI lê os negócios do Bitrix24 da sua corretora para mostrar o seu painel e os seus lembretes, e avisa o seu supervisor quando um prazo vence.",
    "O assistente usa inteligência artificial de um fornecedor terceiro (Anthropic). A corretora autorizou esse uso ao aceitar os termos do WorkSeg AI.",
  ].join("\n\n"),
};

/** A corretora aceitou a versão vigente dos termos? */
export async function termsAccepted(
  store: Store,
  tenant: TenantRecord,
  terms: TermsDocument = CURRENT_TERMS,
): Promise<boolean> {
  const latest = await store.consents.latest(tenant.id, "terms");
  return latest?.version === terms.version;
}

/** IA liberada para a corretora: ligada na configuração **e** termos vigentes aceitos. */
export async function aiAllowed(
  store: Store,
  tenant: TenantRecord,
  terms: TermsDocument = CURRENT_TERMS,
): Promise<boolean> {
  return tenant.config.aiEnabled && (await termsAccepted(store, tenant, terms));
}
