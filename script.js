const recordButton = document.querySelector("#record");
const stopButton = document.querySelector("#stop");

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
    throw new Error(await response.text());
  }

  const resultat = await response.json();
  return resultat.url;
}

async function chargerAudios(jour){
  const page = document.getElementById(jour);
  if(!page) return;

  const liste = page.querySelector(".liste-audios");
  if(!liste) return;

  liste.innerHTML = "Chargement...";

  try {
    const response = await fetch(`/api/voix?jour=${jour}`);
    if(!response.ok){
      throw new Error("Erreur de chargement");
    }


    const audios = await response.json();
    liste.innerHTML= "";

    if (audios.length === 0){
      liste.textContent = "Aucun enregistrement pour ce jour.";
      return;
    }

    audios.forEach((audio)=>{
      const bloc = document.createElement("div");
      const lecteur = document.createElement("audio");
      const date = document.createElement("p");

      lecteur.controls = true;
      lecteur.src= audio.url;

      date.textContent = audio.date || "Enregistrement";

      bloc.appendChild(date);
      bloc.appendChild(lecteur);
      liste.appendChild(bloc);
    });

  }catch (error){
    liste.textContent="Impossible de charger les audios.";
  }
}

  recordButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    jourEnregistrement = document.body.dataset.jour;
    recorder = new MediaRecorder(stream);
    chunks = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());

      const type = recorder.mimeType;
      const blob = new Blob(chunks, { type });

      try {
        await sendVoice(blob, type, jourEnregistrement);
        await chargerAudios(jourEnregistrement);

      } catch (error) {
        console.error(error);
        alert("Impossible d'enregistrer : " + error.message);
      }
    });

    recorder.start();

    recordButton.disabled = true;
    stopButton.disabled = false;

  } catch (error) {
    console.error(error);
    alert("Impossible d'accéder au microphone.");
  }
});

stopButton.addEventListener("click", () => {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  recordButton.disabled = false;
  stopButton.disabled = true;
});

function changerJour(jour) {
  document.body.dataset.jour = jour;

  document.querySelectorAll(".contenu-page").forEach((page) => {
    page.classList.remove("actif");
  });

  document.getElementById(jour)?.classList.add("actif");

  document.querySelectorAll(".bouton-jour").forEach((bouton) => {
    bouton.classList.remove("actif");

    if (bouton.textContent.trim().toLowerCase() === jour) {
      bouton.classList.add("actif");
    }
  });

  chargerAudios(jour);
}

window.changerJour = changerJour;

chargerAudios(document.body.dataset.jour || "lundi");