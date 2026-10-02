// utils/clientId.js — the one place CLT-0001 is counted out.
//
// Counting the collection was the obvious way and the wrong one: delete a
// client and the next count lands on a number that is already taken, so the
// insert dies on the unique index. The highest id that exists is the only
// honest answer, and the retry covers two people converting at once.
import Client from "@/models/clients/Client";

export async function nextClientId() {
  const last = await Client.findOne({ clientId: /^CLT-\d+$/ })
    .sort({ clientId: -1 })
    .select("clientId")
    .lean();
  const num = last ? parseInt(String(last.clientId).replace("CLT-", ""), 10) || 0 : 0;
  return `CLT-${String(num + 1).padStart(4, "0")}`;
}

// Creates the client, stepping the number on if the id was taken in between.
export async function createClient(fields) {
  for (let tries = 0; tries < 5; tries += 1) {
    try {
      const made = await Client.create({ ...fields, clientId: await nextClientId() });
      return made.toObject();
    } catch (e) {
      if (e?.code !== 11000 || !String(e?.message || "").includes("clientId")) throw e;
    }
  }
  throw new Error("Could not allocate a client id — try again");
}
