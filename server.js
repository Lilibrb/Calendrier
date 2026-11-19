import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile} from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const PORT = 3000;
const VOICES_FOLDER = "voix";
const MAX_BYTES = 10 * 1024 * 1024;

const JOURS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];


const VOICE_FILE = /^\/voix\/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\/([a-f0-9-]+\.mp3)$/;

const run = promisify(execFile);

await mkdir(VOICES_FOLDER, { recursive: true });

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_BYTES) {
        reject(new Error("Fichier trop lourd"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function saveVoice(request, jour) {
  if(!JOURS.includes(jour)){
    throw new Error("Jour invalide");
}

  const id = randomUUID();

  const folder = join(VOICES_FOLDER, jour);

  await mkdir(folder,{recursive:true});

  const type = request.headers["contents-type"]??"";

  const extension = type.includes("mp4")?"m4a" : "webm";

  const input = join(folder, `${id}.${extension}`);
  const output = join(folder, `${id}.mp3`);
  
  await writeFile(input, await readBody(request));


  try {
    await run(ffmpegPath, ["-y", "-i", input, "-codec:a", "libmp3lame", "-q:a", "4", output]);
  } finally {
    await unlink(input).catch(()=> {});
  }

  return `/voix/${jour}/${id}.mp3`;
}

function sendVoiceFile(response,jour, name) {
  const stream = createReadStream(join(VOICES_FOLDER, jour,name));

  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": "audio/mpeg" });
    stream.pipe(response);
  });
  stream.on("error", () => {
    if (!response.headerSent){
    response.writeHead(404);
    }
    response.end("Audio introuvable");
  });
}

const fichiers = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/script.js": ["script.js", "text/javascript"]
};

const server = createServer(async (request, response) => {
      const url = new URL(request.url, `http://localhost:${PORT}`);

      if(request.method ==="POST"&&url.pathname ==="/api/voix"){

        try{
          const jour= url.searchParams.get("jour");
          const audioURL = await saveVoice(request, jour);

          response.writeHead(201,{
            "Content-Type":"application/json"
      });

      response.end(JSON.stringify({
        url: audioURL,
        jour
      }));

      console.log("Audio enregistré:", audioURL);
    } catch(error){
      console.error(error);("Erreur d'enregistrement:", error);

      if(!response.destroyed &&!response.headersSent){
        response.writeHead(500,{
          "Content-Type": "application/json"
        });

      response.end(JSON.stringify({
        error: error.message || "Enregistrement impossible"
      }));
    }
  }
  return;
}

  const match = request.method === "GET" ? VOICE_FILE.exec(url.pathname) : null;

  if (match) {
    sendVoiceFile(response, match[1], match[2]);
    return;
  }

response.writeHead(404);
response.end("Page introuvable")
});

server.on("error",(error)=>{
  console.error("Erreur serveur:", error);
})

server.listen(PORT, () => {
  console.log(`Serveur des voix sur http://localhost:${PORT}`);
});