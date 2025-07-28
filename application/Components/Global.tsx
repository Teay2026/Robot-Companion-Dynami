
const API_URL = "https://dynami-api.loca.lt";
export default API_URL;


// Test de la connectivité du server, si l'url est accessible
//fonction qui renvoit true si le serveur est accessible
const testServerConnectivity = async () => {
    try {
        const response = await fetch(API_URL );
        return response.ok;
    } catch (error) {
        console.error(error);

        return false;
    } 
    
};

const testRobotConnectivity = async () => {
    try {
        const response = await fetch(API_URL + '/raspberry');
        return response.ok;
    } catch (error) {
        console.error(error);

        return false;
    } 
    
};





export { testRobotConnectivity, testServerConnectivity };











