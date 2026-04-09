require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("erreur - token n'est pas defini");
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

let monChatId = null;
let seuilAlerte = 90000;
let crypto = "bitcoin";
let lastPrice = {
  valeur: null,
  date: null,
};
let alerteEnvoyee = false;
let isChecking = false;

async function getCryptoPrice(id) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    );
    lastPrice.valeur = res.data[id].usd;
    lastPrice.date = new Date();
    return lastPrice;
  } catch (error) {
    return null;
  }
}

async function getLastPrice() {
  if (lastPrice.date && new Date() - lastPrice.date < 60000) {
    return lastPrice;
  } else {
    const prix = await getCryptoPrice(crypto);
    isChecking = true;
    return prix;
  }
}

bot.start((ctx) => {
  monChatId = ctx.chat.id;
  ctx.reply(`Bot activé, seuil: ${seuilAlerte}$`);
});

bot.command("prix", async (ctx) => {
  const currentPrice = await getLastPrice();
  if (currentPrice && currentPrice.valeur) {
    ctx.replyWithHTML(
      `Prix actuel de <b>${crypto.charAt(0).toUpperCase() + crypto.slice(1)}</b> - ${currentPrice.valeur} $ (dernière mise à jour : ${currentPrice.date.toLocaleTimeString("che-CH")})`,
    );
    console.log(
      "message envoyé : " + JSON.stringify(ctx.message.text, null, 2),
    );
  } else {
    ctx.reply("Erreur c'est produite");
  }
});

bot.command("set", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("Format invalide. Utilise /set <valeur>");
  }
  const val = Number(args[1]);

  if (!Number.isFinite(val) || val <= 0) {
    return ctx.reply(
      "Valeur invalide. Entrez un nombre positif, ex: /set 10000",
    );
  }
  if (val > 10_000_000) {
    return ctx.reply(
      `Valeur trop grande, utilisez une valeur plus petite que 10 millions, ex: /set 10000`,
    );
  }

  seuilAlerte = val;
  monChatId = ctx.chat.id;
  ctx.reply(`Nouveau seuil : ${seuilAlerte} $`);
});

bot.command("crypto", async (ctx) => {
  const args = ctx.message.text.trim().split(/\s+/);
  const newCrypto = (args[1] || "").toLowerCase();

  if (!newCrypto) {
    return ctx.reply("Format invalide. Utilisez /crypto <nom_de_la_crypto>");
  }

  const testPrice = await getCryptoPrice(newCrypto);
  if (!testPrice || typeof testPrice.valeur !== "number") {
    return ctx.reply(
      "Crypto inconnue. Utiliser par exemple: bitcoin, ethereum, solana",
    );
  }

  crypto = newCrypto;
  lastPrice = { valeur: null, date: null };
  alerteEnvoyee = false;
  monChatId = ctx.chat.id;

  return ctx.reply(
    "Crypto suivie mise à jour: " +
      crypto.charAt(0).toUpperCase() +
      crypto.slice(1),
  );
});

async function checkLoop() {
  if (isChecking) return;
  isChecking = true;

  try {
    console.log("Verification du prix...");
    if (!monChatId) return;

    const currentPrice = await getLastPrice();
    if (!currentPrice || !currentPrice.valeur) return;

    if (currentPrice.valeur <= seuilAlerte && !alerteEnvoyee) {
      await bot.telegram.sendMessage(
        monChatId,
        `ALERTE : ${crypto} a ${currentPrice.valeur} $ (Seuil : ${seuilAlerte}$)`,
      );
      alerteEnvoyee = true;
    } else if (currentPrice.valeur > seuilAlerte && alerteEnvoyee) {
      alerteEnvoyee = false;
      await bot.telegram.sendMessage(
        monChatId,
        `INFO : ${crypto} est remonte au-dessus du seuil de ${seuilAlerte}$ (Prix : ${currentPrice.valeur}$).`,
      );
    }
  } finally {
    isChecking = false;
  }
}

setInterval(checkLoop, 60000);

bot.telegram.deleteWebhook().then(() => {
  bot.launch().then(() => console.log("Bot lancé !"));
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
