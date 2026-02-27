const { Telegraf } = require("telegraf");
const axios = require("axios");

const TOKEN = "8365267679:AAGNr_3RLI4g1iSVmLdnxK36F5jXNlhyEdY";
const bot = new Telegraf(TOKEN);

let monChatId = null;
let seuilAlerte = 90000;
let lastPrice = {
  valeur: null,
  date: null,
};

async function getBitcoinPrice() {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    );
    lastPrice.valeur = res.data.bitcoin.usd;
    lastPrice.date = new Date();
    return lastPrice;
  } catch (error) {
    return null;
  }
}

async function getLastPrice() {
  if (new Date() - lastPrice.date < 60000) {
    return lastPrice;
  } else {
    const prix = await getBitcoinPrice();
    return prix;
  }
}

bot.start((ctx) => {
  monChatId = ctx.chat.id;
  ctx.reply(`Bot activé, seuil: ${seuilAlerte}$`);
});

bot.command("prix", async (ctx) => {
  const lastPrice = await getLastPrice();
  if (lastPrice.valeur) {
    ctx.reply(
      `Prix actuel : ${lastPrice.valeur} $ (dernière mise à jour : ${lastPrice.date.toLocaleTimeString()})`,
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
  const val = parseFloat(args[1]);
  if (!isNaN(val)) {
    seuilAlerte = val;
    monChatId = ctx.chat.id;
    ctx.reply(`Nouveau seuil : ${seuilAlerte} $`);
  } else {
    ctx.reply("Format invalide. Utilisez /set <valeur>");
  }
});

async function checkLoop() {
  console.log("Vérification du prix...");
  if (!monChatId) return;
  const lastPrice = await getLastPrice();
  if (lastPrice.valeur <= seuilAlerte) {
    bot.telegram.sendMessage(
      monChatId,
      `Bitcoin à ${lastPrice.valeur} $ (Seuil: ${seuilAlerte}$)`,
    );
  }
}

setInterval(checkLoop, 60000);

bot.telegram.deleteWebhook().then(() => {
  bot.launch();
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
