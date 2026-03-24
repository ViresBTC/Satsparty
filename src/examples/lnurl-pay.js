/**
 * Ejemplo: Pagar Lightning Address
 * 
 * Uso: npm run example:lnurl
 */

import { LightningAddress, requestInvoice } from "@getalby/lightning-tools";

async function main() {
  console.log("⚡ Lightning Address Demo\n");

  // 1. Resolver Lightning Address
  const address = "hello@getalby.com"; // Cambiar por cualquier Lightning Address
  
  console.log(`📍 Resolviendo ${address}...\n`);
  
  try {
    const ln = new LightningAddress(address);
    await ln.fetch();

    // Mostrar info
    console.log("✅ Lightning Address válida!");
    console.log("");
    console.log("Datos LNURL:");
    console.log(`   Min sendable: ${ln.lnurlpData.minSendable / 1000} sats`);
    console.log(`   Max sendable: ${ln.lnurlpData.maxSendable / 1000} sats`);
    console.log(`   Descripción: ${ln.lnurlpData.metadata}`);
    console.log("");

    // 2. Generar invoice de 21 sats
    console.log("📝 Generando invoice de 21 sats...\n");
    
    const invoice = await ln.requestInvoice({ satoshi: 21 });
    
    console.log("✅ Invoice generado!");
    console.log("");
    console.log("Payment Request:");
    console.log(invoice.paymentRequest);
    console.log("");
    console.log("Ahora podés pagar este invoice desde tu wallet.");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  // 3. Demo requestInvoice directo
  console.log("\n---\n");
  console.log("📍 Método alternativo: requestInvoice()\n");

  try {
    const invoice = await requestInvoice({
      lnUrlOrAddress: "claudio@lacrypta.ar",
      tokens: 100
    });
    
    console.log("✅ Invoice (100 sats):");
    console.log(invoice.paymentRequest.slice(0, 80) + "...");
    
  } catch (error) {
    console.log("⚠️  No se pudo resolver (puede que la address no exista)");
  }
}

main();
