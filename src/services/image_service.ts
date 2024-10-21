import { Image } from "../utils/image_model";

const endPoint1Images = 'https://api.unsplash.com/search/photos?page=1&query=';
const endPont1 = '&client_id=fc0Hj6zBd3nkUad8E_hpoC2cTsyjo5lj6ca7nQi1ey4';


export function searchImage(actividad:string){
    fetch(endPoint1Images + actividad + endPont1).then((respuesta) => respuesta.json())
    .then((data) => {
        console.log(endPoint1Images + actividad + endPont1)
        let image: Image = data;
        let imagen = document.getElementsByTagName("img")[0];
        imagen.src = image.results[0].urls.small;
        imagen.width = 250;
    })
    .catch((error) => console.error("Error: " + error));
}