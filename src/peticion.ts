import { searchImage } from "./services/image_service";
import { Activity } from "./utils/activity";

const endpoint = 'https://bored.api.lewagon.com/api/activity/';
let parrafo = document.getElementsByTagName("p")[0];

function httpActivity(){
     fetch(endpoint + `?type=${getActivity()}&participants=${getParticipants()}`).then((respuesta) => respuesta.json()).then((data) =>{
         let mainActivity: Activity = data;

         if (mainActivity.activity != undefined){
            parrafo.innerHTML = `La actividad es <b>${mainActivity.activity}</b>.<br>Participan <b>${mainActivity.participants}</b> persona/s<br>
            Tiene un costo de <b>${mainActivity.price}€</b><br>
            Su accesibilidad es de <b>${mainActivity.accessibility}</b>`;  
            searchImage(mainActivity.activity);
         } else parrafo.innerHTML =  'No existe ninguna mainActivity con esas características';  
     } ).catch((error) => console.log('error: ' + error));
 }

export function getActivity(){
    let mainActivity = document.getElementById("tipos") as HTMLSelectElement;
    return mainActivity.value;
}

function getParticipants(){
    let participantes = document.getElementById("participantes") as HTMLInputElement;
    return participantes.value;
}

document.getElementById("boton")?.addEventListener("click",httpActivity);

