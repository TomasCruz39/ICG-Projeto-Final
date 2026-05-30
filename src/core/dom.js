// Referências centralizadas aos elementos do DOM
// Assim não fazemos getElementById espalhado por todo o código

const hud = document.getElementById("hud");
const message = document.getElementById("message");
const menu = document.getElementById("menu");
const menuMaps = document.getElementById("menu-maps");
const menuScores = document.getElementById("menu-scores");
const menuStart = document.getElementById("menu-start");
const menuAudio = document.getElementById("menu-audio");
const menuResetScores = document.getElementById("menu-reset-scores");

export { hud, message, menu, menuMaps, menuScores, menuStart, menuAudio, menuResetScores };
