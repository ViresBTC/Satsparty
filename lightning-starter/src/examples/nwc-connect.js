/**
 * Ejemplo: Conectar wallet con NWC
 * 
 * Uso: npm run example:nwc
 */

import { nwc } from "@getalby/sdk";

const NWC_URL = process.env.NWC_URL;

async function main() {
  console.log("⚡ NWC Connection Demo\n");

  if (!NWC_URL) {
    console.log("⚠️  NWC_URL no configurada\n");
    console.log("Para obtener tu NWC URL:");
    console.log("1. Andá a getalby.com y creá una cuenta");
    console.log("2. Settings → Nostr Wallet Connect");
    console.log("3. Create new connection");
    console.log("4. Copiá el connection string");
    console.log("5. Agregalo a tu .env como NWC_URL=nostr+walletconnect://...");
    console.log("");
    console.log("Ejemplo de string NWC:");
    console.log("nostr+walletconnect://69effe...");
    return;
  }

  console.log("🔌 Conectando con NWC...\n");

  try {
    const client = new nwc.NWCClient({
      nostrWalletConnectUrl: NWC_URL
    });

    // Obtener info
    const info = await client.getInfo();
    
    console.log("✅ Conexión exitosa!\n");
    console.log("Info de la wallet:");
    console.log(`   Alias: ${info.alias || "Sin nombre"}`);
    console.log(`   Color: ${info.color || "N/A"}`);
    console.log(`   Pubkey: ${info.pubkey?.slice(0, 32)}...`);
    console.log(`   Network: ${info.network || "mainnet"}`);
    console.log("");

    // Obtener balance
    const balance = await client.getBalance();
    console.log("💰 Balance:");
    console.log(`   ${balance.balance / 1000} sats`);
    console.log("");

    // Listar transacciones recientes
    console.log("📜 Últimas transacciones:");
    const txs = await client.listTransactions({
      limit: 5
    });
    
    if (txs.transactions?.length > 0) {
      txs.transactions.forEach((tx, i) => {
        const type = tx.type === "incoming" ? "⬇️ " : "⬆️ ";
        const amount = tx.amount / 1000;
        console.log(`   ${type} ${amount} sats - ${tx.description || "Sin descripción"}`);
      });
    } else {
      console.log("   No hay transacciones recientes");
    }

    // Métodos disponibles
    console.log("\n📚 Métodos NWC disponibles:");
    console.log("   - client.makeInvoice({ amount, description })");
    console.log("   - client.payInvoice({ invoice })");
    console.log("   - client.getBalance()");
    console.log("   - client.listTransactions({ limit })");
    console.log("   - client.lookupInvoice({ paymentHash })");

    client.close();

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\nPosibles causas:");
    console.log("- NWC_URL inválida o expirada");
    console.log("- La wallet no tiene permisos suficientes");
    console.log("- Problemas de conexión con los relays");
  }
}

main();
