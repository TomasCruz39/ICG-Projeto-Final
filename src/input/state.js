// Estado do input de rato — partilhado entre controls.js e menu.js

const input = {
    draggingCamera: false,  // botão esquerdo pressionado
    draggingAim: false,     // botão direito pressionado
    prevX: 0,
    prevY: 0,
    activePointerId: null,  // id do pointer ativo (para ignorar segundos dedos no touch)
    
    // Mobile
    isMobile: false,
    mobileAimMode: false,   // false = câmara, true = mira
    activeTouches: new Map(),
    initialPinchDist: null,
};

// Limpar ao abrir o menu para não ficar estado "preso"
function resetInputState() {
    input.draggingCamera = false;
    input.draggingAim = false;
    input.prevX = 0;
    input.prevY = 0;
    input.activePointerId = null;
    input.activeTouches.clear();
    input.initialPinchDist = null;
}

export { input, resetInputState };
