/**
 * Контракт банковского соединителя v0.6 (PROPOSED / not approved).
 * Не содержит реализации, HTTP-клиента или секретов банка.
 * Внутренний SPI: не публикуется продавцам напрямую.
 *
 * Источник: payment-lifecycle-spec-v0.8.md, BR-01/BR-02/BR-02.1/BR-03.1/BR-03.2/BR-04/NAME-01 approved.
 * Параметры банка не меняют финансовые инварианты платёжного ядра.
 */

export type IsoDateTime = string; // RFC 3339, UTC при хранении
export type LocalId = string;
export type Currency = "RUB"; // расширение валют отдельно согласовать
export type MoneyMinor = number; // целое 1..Number.MAX_SAFE_INTEGER, runtime-validation required
export type MoneyMinorOrZero = number; // целое >= 0; все суммы в копейках для RUB

export type PaymentRail = "card" | "sbp" | "saved_card";
export type AcquirerOperation =
  | "debit"          // прямая одноэтапная оплата; карты/СБП
  | "authorize"      // создать карточный холд
  | "capture"        // подтвердить холд
  | "void"           // освободить непотраченный холд
  | "refund"         // вернуть ранее оплаченное
  | "setup_method"   // привязка без оплаты
  | "debit_saved";   // новый платёж по ранее сохранённому способу

export type CapabilityName =
  | "card_payment"
  | "sbp_dynamic_qr"
  | "manual_capture"
  | "single_partial_capture"
  | "multiple_partial_captures"
  | "void_authorization"
  | "partial_refund"
  | "multiple_refunds"
  | "setup_card"
  | "merchant_initiated_saved_payment"
  | "status_by_reference"
  | "signed_callbacks"
  | "reconciliation_feed"
  | "provider_idempotent_replay"
  | "form_provider"      // банковская платёжная страница
  | "form_direct"        // банк допускает нашу форму через PCI-контур
  | "form_fields";       // hosted fields / bank tokenization SDK, если предоставляется

export type CapabilityStatus = "supported" | "unsupported" | "unknown";
export interface CapabilityEvidence {
  status: CapabilityStatus;
  source: "bank_document" | "bank_written_confirmation" | "sandbox_test" | "contract" | "inference";
  source_reference?: string; // версия документа/теста, НЕ секрет
  checked_at?: IsoDateTime;
  constraints?: Record<string, string | number | boolean | null>;
}
export interface CapabilityProfile {
  provider: string;
  connection_id: LocalId;
  profile_version: string;
  features: Partial<Record<CapabilityName, CapabilityEvidence>>;
  // Отсутствующий/unknown означает НЕЛЬЗЯ рекламировать клиенту поддержку.
}

/** Выбранный маршрут неизменен в рамках одного Payment после начала банковской оплаты. */
export interface AcquirerContext {
  provider: string;
  merchant_id: LocalId;
  connection_id: LocalId;
  terminal_reference: string; // внутренний ID терминала, без логина/секретов
  capabilities_version: string;
  config_version: string;
  credential_ref: string; // ссылка на менеджер секретов, никогда не сам секрет
  trace_id: string;
}

/**
 * Ключевое разделение:
 * command_id — наш идентификатор подготовленной банковской отправки;
 * request_ref — назначенное заранее внешнее значение, ЕСЛИ протокол его принимает;
 * original_ref — внешний ID исходного платежа для refund/void/capture;
 * operation_ref — отдельный ID новой банковской операции, ЕСЛИ банк его возвращает.
 * PaymentIntent (если есть) коррелирует Payment только в ядре и НИКОГДА
 * не создаётся банковским соединителем.
 * Наличие наших ID не доказывает банковскую идемпотентность.
 */
export interface CommandIdentity {
  command_id: LocalId;
  payment_id: LocalId;
  operation_id: LocalId;
  request_ref: string;
  original_ref?: string;
  submitted_at?: IsoDateTime;
}

export interface CardPaymentSource {
  kind: "hosted_card_form";
  return_url: string; // HTTPS, allowlisted домен продавца
}
/**
 * Карточные реквизиты НИКОГДА не включаются в этот SPI или обычный Payment Core.
 * card_ref: защищенная краткоживущая ссылка, доступная только PCI Card Gateway.
 * Профиль direct-режима должен быть проверен для конкретного терминала/PCI scope.
 */
export interface SecureCardPaymentSource {
  kind: "secure_card_ref";
  card_ref: string;
  return_url: string;
}
export interface SbpPaymentSource {
  kind: "sbp_qr";
  qr_type: "dynamic"; // статические QR в базовом контракте не обещаны
  return_url?: string;
}
export interface SavedPaymentSource {
  kind: "saved_card";
  method_id: LocalId; // наш идентификатор
  token_ref: string; // ссылка на защищённое хранилище, не PAN/CVV
  customer_id: LocalId;
  initiated_by: "customer" | "merchant";
  consent_reference?: string;
}
export type PaymentSource = CardPaymentSource | SecureCardPaymentSource | SbpPaymentSource | SavedPaymentSource;

export interface BaseConnectorCommand {
  identity: CommandIdentity;
  currency: Currency;
  description?: string;
  // Наличие параметра не делает действие поддерживаемым; проверяется CapabilityProfile.
  provider_parameters?: ProviderParameters;
}
export type ConnectorCommand =
  | (BaseConnectorCommand & { kind: "debit"; amount: MoneyMinor; source: CardPaymentSource | SecureCardPaymentSource | SbpPaymentSource })
  | (BaseConnectorCommand & { kind: "authorize"; amount: MoneyMinor; source: CardPaymentSource | SecureCardPaymentSource | SavedPaymentSource })
  | (BaseConnectorCommand & { kind: "debit_saved"; amount: MoneyMinor; source: SavedPaymentSource })
  | (BaseConnectorCommand & { kind: "capture"; amount: MoneyMinor; final: true /* Internal SPI: public v1 CaptureRequest has no final flag. Multi-capture needs an approved extension. */ })
  | (BaseConnectorCommand & { kind: "void"; amount: MoneyMinor })
  | (BaseConnectorCommand & { kind: "refund"; amount: MoneyMinor; refund_id: LocalId })
  | (BaseConnectorCommand & { kind: "setup_method"; source: CardPaymentSource | SecureCardPaymentSource; customer_id: LocalId; consent_reference?: string; verification_amount?: MoneyMinorOrZero });

/** Дополнительные банковские значения всегда валидируются отдельной версионированной схемой. */
export interface ProviderParameters {
  provider: string;
  schema_version: number;
  data: Record<string, unknown>;
}

export interface BankCorrelation {
  request_ref?: string;
  original_ref?: string;
  payment_ref?: string;
  operation_ref?: string;
  terminal_reference?: string;
}
export type EvidenceChannel =
  | "authenticated_http_response"
  | "verified_callback"
  | "status_query"
  | "reconciliation_report"
  | "manual_bank_confirmation";
export interface ResultEvidence {
  channel: EvidenceChannel;
  evidence_id: string; // локальный ID проверенного свидетельства
  external_reference: string;
  recorded_at: IsoDateTime;
  reported_at?: IsoDateTime;
  message_hash?: string; // полезен без хранения секретов/полных карточных данных
  rule_version: string; // по какой проверенной схеме принято решение о результате
}

export type CustomerAction =
  | { kind: "redirect"; url: string }
  | { kind: "display_qr"; payload: string; expires_at?: IsoDateTime }
  | { kind: "sdk_action"; action_name: string; opaque_parameters: ProviderParameters };

export type FinancialEffect = "paid" | "authorized" | "captured" | "voided" | "refunded" | "method_saved";
export type NormalizedReason =
  | "insufficient_funds" | "invalid_payment_method" | "authentication_failed"
  | "expired" | "bank_rejected" | "unsupported_operation" | "other";

/**
 * Никаких throw для неопределённости после возможной отправки в банк.
 * Даже HTTP 500/timeout после отправки — unknown, а не declined.
 * not_dispatched допускается только при ДОКАЗАННОМ отсутствии передачи банку.
 */
export type ConnectorResult =
  | { kind: "requires_action"; correlation: BankCorrelation; action: CustomerAction; provider_data?: ProviderParameters }
  | { kind: "accepted"; correlation: BankCorrelation; evidence: ResultEvidence; provider_data?: ProviderParameters }
  | { kind: "succeeded"; correlation: BankCorrelation; effect: FinancialEffect; evidence: ResultEvidence; amount: MoneyMinorOrZero; provider_data?: ProviderParameters }
  // BR-04: позднее документально подтверждённое обратное движение именно ранее успешного refund.
  // amount — подтверждённая сумма обращения; ядро определяет допустимость коррекции, не драйвер банка.
  | { kind: "reversed"; correlation: BankCorrelation; effect: "refunded"; evidence: ResultEvidence; amount: MoneyMinor; provider_data?: ProviderParameters }
  | { kind: "declined"; correlation: BankCorrelation; reason: NormalizedReason; evidence: ResultEvidence; provider_data?: ProviderParameters }
  | { kind: "unknown"; correlation: BankCorrelation; reason: "timeout" | "connection_lost" | "server_error" | "conflicting_evidence" | "unexpected_response"; provider_data?: ProviderParameters }
  | { kind: "not_dispatched"; reason: "unsupported" | "local_validation" | "credentials_missing" | "proven_pre_send_failure"; provider_data?: ProviderParameters };

export interface LookupOperation {
  identity: CommandIdentity;
  correlation: BankCorrelation;
  // Никогда не чаще разрешённого банком интервала; core хранит polled_at.
}
export type LookupResult = ConnectorResult | { kind: "not_found_nonfinal"; correlation: BankCorrelation; evidence: ResultEvidence };

/** Наличие отсутствующего заказа в одном запросе статуса не всегда доказывает отсутствие списания. */
export interface VerifiedBankEvent {
  event_id: string; // уникален в рамках provider + connection_id; fallback: стабильный hash
  provider: string;
  connection_id: string;
  correlation: BankCorrelation;
  received_at: IsoDateTime;
  reported_at?: IsoDateTime;
  result: Exclude<ConnectorResult, { kind: "not_dispatched" }>;
  evidence: ResultEvidence;
}
export interface RawBankNotification {
  raw_body: Uint8Array; // без парсинга/модификации до проверки подписи
  headers: Readonly<Record<string, string | string[] | undefined>>;
  received_at: IsoDateTime;
}
export type BankNotificationResult =
  | { kind: "verified"; events: readonly VerifiedBankEvent[] }
  | { kind: "rejected"; reason: "invalid_signature" | "unsupported_format" | "unknown_merchant" | "replay_protection" };

export interface SettlementCursor { since: IsoDateTime; until: IsoDateTime; page_token?: string }
export interface SettlementRecord {
  evidence: ResultEvidence;
  correlation: BankCorrelation;
  amount: MoneyMinorOrZero;
  currency: Currency;
  record_type: "payment" | "capture" | "refund" | "adjustment";
  settlement_date?: string;
}

/** Никакой реализации бизнес-учёта, таблиц состояний и выбора маршрута в соединителе. */
export interface AcquirerConnector {
  readonly provider: string;
  getCapabilities(context: AcquirerContext): Promise<CapabilityProfile>;
  submit(context: AcquirerContext, command: ConnectorCommand): Promise<ConnectorResult>;
  lookup(context: AcquirerContext, request: LookupOperation): Promise<LookupResult>;
  verifyAndParseNotification(context: AcquirerContext, incoming: RawBankNotification): Promise<BankNotificationResult>;
  getSettlementRecords?(context: AcquirerContext, cursor: SettlementCursor): Promise<readonly SettlementRecord[]>;
}

// BR-04: accepted refund != succeeded; unknown сохраняет резерв; reversed — только по отдельному банковскому доказательству.
// NAME-01: собственные поля — не более двух смысловых слов; внешние банковские
// payloads остаются в ProviderParameters.data без изменения имён банка.
// BR-03.2: ядро проверяет публичный reduce=true до отправки, СПИ ничего не
// знает о корректировке PaymentIntent.amount_final.
