/**
 * Ejemplo: Pagar invoice con NWC
 * 
 * Uso: NWC_URL=... INVOICE=lnbc... npm run example:pay
 */

import { nwc } from "@getalby/sdk";

const NWC_URL = process.env.NWC_URL;
const INVOICE = process.env.INVOICE;

async function main() {
  console.log("⚡ Pay Invoice Demo\n");

  if (!NWC_URL) {
    console.log("⚠️  Configurá NWC_URL en tu .env");
    return;
  }

  if (!INVOICE) {
    console.log("⚠️  Pasá el invoice como variable de entorno:");
    console.log("   INVOICE=lnbc... npm run example:pay");
    console.log("");
    console.log("O pegá un invoice acá en el código para testing.");
    return;
  }

  console.log("🔌 Conectando wallet...\n");

  try {
    const client = new nwc.NWCClient({
      nostrWalletConnectUrl: NWC_URL
    });

    // Mostrar balance antes
    const balanceBefore = await client.getBalance();
    console.log(`💰 Balance actual: ${balanceBefore.balance / 1000} sats\n`);

    // Decodificar invoice (opcional, para mostrar info)
    console.log("📝 Invoice a pagar:");
    console.log(`   ${INVOICE.slice(0, 50)}...`);
    console.log("");

    // Confirmar pago
    console.log("💸 Enviando pago...\n");

    const response = await client.payInvoice({
      invoice: INVOICE
    });

    console.log("✅ Pago exitoso!");
    console.log("");
    console.log("Detalles:");
    console.log(`   Preimage: ${response.preimage}`);
    console.log(`   Fees: ${(response.fees_paid || 0) / 1000} sats`);

    // Balance después
    const balanceAfter = await client.getBalance();
    console.log(`\n💰 Balance nuevo: ${balanceAfter.balance / 1000} sats`);

    client.close();

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
    if (error.message.includes("insufficient")) {
      console.log("Tip: No tenés suficiente balance en la wallet");
    } else if (error.message.includes("expired")) {
      console.log("Tip: El invoice expiró, pedí uno nuevo");
    }
  }
}

main();
