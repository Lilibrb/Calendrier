const recordButton = document.querySelector("#record");
const stopButton = document.querySelector("#stop");
const player = document.querySelector("audio");

let recorder = null;
let chunks = [];
let jourEnregistrement = null;

async function sendVoice(blob, type,jour) {

  const response = await fetch(`/api/voix?jour=${jour}`, {
    method: "POST",
    headers: { "Content-Type": type },
    body: blob,
  });

  if (!response.ok) {
    const erreur = await response.text();
    throw new Error(erreur);
  }

  const resultat = await response.json();
  return resultat.url;
}

recordButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    jourEnregistrement = document.body.dataset.jour;
    recorder = new MediaRecorder(stream);
    chunks = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size >0){
         chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());

      const type = recorder.mimeType;
      const blob = new Blob(chunks, { type});

      try {
        const url = await sendVoice(blob, type, jourEnregistrement);
        console.log("MP3 enregistré:", url);
        player.src = url;
        player.load();
      } catch (error) {
        console.error("Erreur lors de l'envoi:",error);
        alert("Impossible d'enregistrer le fichier:"+ error.message);
      }
    });

    recorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
  } catch (error) {
    console.error("Micro refusé ou indisponible :", error);
    alert("Impossible d'accéder au microphone.");
  }
});

stopButton.addEventListener("click", () => {
  if (recorder && recorder.state !== "inactive"){
    recorder.stop();
  }
  recordButton.disabled = false;
  stopButton.disabled = true;
});


function changerJour(jour){
  document.body.dataset.jour = jour;

  document.querySelectorAll(".contenu-page").forEach((page) =>{
    page.classList.remove("actif");
  });

  document.getElementById(jour)?.classList.add("actif");

  document.querySelectorAll(".bouton-jour").forEach((bouton)=>{
    bouton.classList.remove("actif");

    if(bouton.textContent.trim().toLowerCase()=== jour){
      bouton.classList.add("actif");
    }
  });
}

window.changerJour = changerJour;