// Minimal description of the "modem-pay" package so TypeScript is happy.
declare module "modem-pay" {
  export default class ModemPay {
    constructor(secretKey: string);
    webhooks: {
      composeEventDetails(
        rawBody: string,
        signature: string,
        webhookSecret: string
      ): { event: string; payload: Record<string, any> | null };
    };
  }
}
