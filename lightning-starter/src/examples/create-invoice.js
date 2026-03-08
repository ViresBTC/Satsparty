/**
 * Ejemplo: Crear invoice con NWC
 * 
 * Uso: npm run example:invoice
 */

import { nwc } from "@getalby/sdk";

// Tu NWC connection string (desde Alby u otra wallet)
const NWC_URL = process.env.NWC_URL || "nostr+walletconnect://...";

async function main() {
  console.log("⚡ Conectando wallet...\n");

  try {
    // Crear cliente NWC
    const client = new nwc.NWCClient({
      nostrWalletConnectUrl: NWC_URL
    });

    // Obtener info de la wallet
    const info = await client.getInfo();
    console.log("✅ Wallet conectada!");
    console.log(`   Alias: ${info.alias || "N/A"}`);
    console.log(`   Pubkey: ${info.pubkey?.slice(0, 16)}...`);
    console.log("");

    // Crear invoice de 100 sats
    console.log("📝 Creando invoice de 100 sats...\n");
    
    const invoice = await client.makeInvoice({
      amount: 100 * 1000, // milisat (100 sats = 100000 msat)
      description: "Test invoice - Lightning Starter Kit"
    });

    console.log("✅ Invoice creado!");
    console.log("");
    console.log("Payment Request (bolt11):");
    console.log(invoice.paymentRequest);
    console.log("");
    console.log(`Payment Hash: ${invoice.paymentHash}`);
    
    // Cerrar conexión
    client.close();

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
    console.log("Tip: Asegurate de configurar NWC_URL en tu .env");
  }
}

main();
